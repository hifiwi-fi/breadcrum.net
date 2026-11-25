import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { Client } from 'pg'
import { config, createApp } from '#test/helper.js'
import { integrationFixture } from '#test/integration-fixture.js'
import { syncEdit } from './sync-edit.js'

/**
 * @import { TestContext } from 'node:test'
 * @import { QueryResult } from 'pg'
 * @import { SyncBootstrap, SyncChanges } from './sync-schemas.js'
 * @import { BookmarkEdit } from './mutation-schemas.js'
 */

/** @param {Client} db */
async function addAccount (db) {
  const username = `synctest-${randomUUID().replaceAll('-', '')}`
  /** @type {QueryResult<{id: string}>} */
  const result = await db.query(
    'insert into users (username, email, password) values ($1, $2, $3) returning id',
    [username, `${username}@example.com`, 'fixture']
  )
  const row = result.rows[0]
  assert.ok(row)
  return { id: row.id, username }
}

/** @param {Client} db @param {string} owner @param {string} [id] */
async function addBookmark (db, owner, id = randomUUID()) {
  await db.query('insert into bookmarks (id, owner_id, url) values ($1, $2, $3)', [id, owner, `https://example.com/${id}`])
  return id
}

/** @param {Client} db @param {string} owner @param {string} bookmark */
async function addArchive (db, owner, bookmark) {
  const id = randomUUID()
  await db.query(`
    insert into archives (id, owner_id, bookmark_id, url, extraction_method, html_content, text_content)
    values ($1, $2, $3, 'https://example.com', 'server', '<p>archive body</p>', 'archive body')
  `, [id, owner, bookmark])
  return id
}

/** @param {Client} db @param {string} owner @param {string} bookmark @param {string} feed */
async function addEpisode (db, owner, bookmark, feed) {
  const id = randomUUID()
  await db.query(`
    insert into episodes (id, owner_id, bookmark_id, podcast_feed_id, type, medium, url, oembed, created_at)
    values ($1, $2, $3, $4, 'redirect', 'video', 'https://example.com/private-media', $5, now() - interval '10 days')
  `, [id, owner, bookmark, feed, { html: '<iframe>private embed</iframe>' }])
  return id
}

/** @param {Client} db @param {string} owner */
async function addFeed (db, owner) {
  const id = randomUUID()
  await db.query('insert into podcast_feeds (id, owner_id) values ($1, $2)', [id, owner])
  return id
}

/** @param {Client} db @param {string} owner */
async function head (db, owner) {
  /** @type {QueryResult<{revision: string}>} */
  const result = await db.query('select revision::text from sync_heads where owner_id = $1', [owner])
  return BigInt(result.rows[0]?.revision ?? '0')
}

/** @param {Client} db @param {string} owner @param {bigint} after */
async function refreshed (db, owner, after) {
  /** @type {QueryResult<{bookmark_id: string}>} */
  const result = await db.query(
    'select bookmark_id from sync_bookmark_changes where owner_id = $1 and revision > $2 order by revision',
    [owner, after.toString()]
  )
  return result.rows.map(row => row.bookmark_id)
}

/** @param {Client} db @param {string} owner */
async function tombstones (db, owner) {
  const result = await db.query(`
    select resource_type, resource_id, bookmark_id
    from sync_tombstones where owner_id = $1 order by revision
  `, [owner])
  return result.rows
}

/** @param {string} databaseUrl @param {TestContext} t */
async function connect (databaseUrl, t) {
  const client = new Client({ connectionString: databaseUrl, statement_timeout: 8000 })
  await client.connect()
  t.after(() => client.end())
  return client
}

/** @param {Client} client */
async function backendId (client) {
  /** @type {QueryResult<{pid: number}>} */
  const result = await client.query('select pg_backend_pid() as pid')
  const row = result.rows[0]
  assert.ok(row)
  return row.pid
}

test('delta sync against migrated PostgreSQL', { timeout: 45000 }, async t => {
  const fixture = await integrationFixture(t)

  await t.test('captures tag membership, renames, and prune-on-empty', async t => {
    const db = await connect(fixture.databaseUrl, t)
    const { id: owner } = await addAccount(db)
    const first = await addBookmark(db, owner)
    const second = await addBookmark(db, owner)
    const tag = randomUUID()
    await db.query("insert into tags (id, owner_id, name) values ($1, $2, 'Reading')", [tag, owner])

    let prior = await head(db, owner)
    await db.query('insert into bookmarks_tags (bookmark_id, tag_id) values ($1, $3), ($2, $3)', [first, second, tag])
    assert.deepEqual(new Set(await refreshed(db, owner, prior)), new Set([first, second]))
    assert.equal(await head(db, owner), prior + 2n)

    prior = await head(db, owner)
    await db.query("update tags set name = 'reading' where id = $1", [tag])
    assert.deepEqual(new Set(await refreshed(db, owner, prior)), new Set([first, second]))

    prior = await head(db, owner)
    await db.query('delete from bookmarks_tags where tag_id = $1 and bookmark_id = $2', [tag, first])
    assert.deepEqual(await refreshed(db, owner, prior), [first])
    assert.deepEqual(await tombstones(db, owner), [])

    prior = await head(db, owner)
    await db.query('delete from bookmarks_tags where tag_id = $1 and bookmark_id = $2', [tag, second])
    assert.deepEqual(await refreshed(db, owner, prior), [second])
    assert.deepEqual(await tombstones(db, owner), [
      { resource_type: 'tag', resource_id: tag, bookmark_id: null },
    ])
  })

  await t.test('publishes only committed changes and cleans up after account deletion', async t => {
    const db = await connect(fixture.databaseUrl, t)
    const { id: owner } = await addAccount(db)
    const bookmark = await addBookmark(db, owner)
    const feed = await addFeed(db, owner)
    const archive = await addArchive(db, owner, bookmark)
    const episode = await addEpisode(db, owner, bookmark, feed)

    let prior = await head(db, owner)
    await db.query('begin')
    await db.query('delete from bookmarks where id = $1', [bookmark])
    await db.query('set constraints sync_publish_at_commit immediate')
    await db.query('rollback')
    assert.equal(await head(db, owner), prior)
    assert.deepEqual(await tombstones(db, owner), [])
    assert.equal((await db.query('select from bookmarks where id = $1', [bookmark])).rowCount, 1)

    await db.query('update archives set done = true where id = $1', [archive])
    assert.deepEqual(await refreshed(db, owner, prior), [bookmark])
    prior = await head(db, owner)
    await db.query('delete from archives where id = $1', [archive])
    assert.deepEqual(await refreshed(db, owner, prior), [bookmark])
    assert.deepEqual(await tombstones(db, owner), [
      { resource_type: 'archive', resource_id: archive, bookmark_id: bookmark },
    ])

    prior = await head(db, owner)
    await db.query('delete from episodes where id = $1', [episode])
    assert.deepEqual(await refreshed(db, owner, prior), [bookmark])
    assert.deepEqual((await tombstones(db, owner)).at(-1), {
      resource_type: 'episode', resource_id: episode, bookmark_id: bookmark,
    })

    const cascade = await addArchive(db, owner, bookmark)
    prior = await head(db, owner)
    await db.query('delete from bookmarks where id = $1', [bookmark])
    assert.deepEqual(await refreshed(db, owner, 0n), [])
    assert.deepEqual((await tombstones(db, owner)).slice(-2), [
      { resource_type: 'archive', resource_id: cascade, bookmark_id: bookmark },
      { resource_type: 'bookmark', resource_id: bookmark, bookmark_id: null },
    ])
    assert.equal(await head(db, owner), prior + 2n)

    await addBookmark(db, owner)
    await db.query('delete from users where id = $1', [owner])
    assert.equal(await head(db, owner), 0n)
    assert.deepEqual(await tombstones(db, owner), [])
    assert.deepEqual(await refreshed(db, owner, 0n), [])
    assert.equal((await db.query('select from sync_pending_changes')).rowCount, 0)
    assert.equal((await db.query('select from sync_pending_transactions')).rowCount, 0)
  })

  await t.test('serializes same-account publishers without blocking an independent account', async t => {
    const [reader, writerA, writerB] = await Promise.all([
      connect(fixture.databaseUrl, t), connect(fixture.databaseUrl, t), connect(fixture.databaseUrl, t),
    ])
    const { id: accountA } = await addAccount(reader)
    const { id: accountB } = await addAccount(reader)
    const first = await addBookmark(reader, accountA)
    const second = await addBookmark(reader, accountA)
    const independent = await addBookmark(reader, accountB)
    const prior = await head(reader, accountA)
    const a = await backendId(writerA)
    const b = await backendId(writerB)

    try {
      await writerA.query('begin')
      await writerA.query("update bookmarks set title = 'first' where id = $1", [first])
      await writerA.query('set constraints sync_publish_at_commit immediate')
      await writerB.query('begin')
      await writerB.query("update bookmarks set title = 'second' where id = $1", [second])
      const commit = writerB.query('commit')
      commit.catch(() => {})
      await t.waitFor(async () => {
        /** @type {QueryResult<{pids: number[]}>} */
        const result = await reader.query('select pg_blocking_pids($1) as pids', [b])
        assert.ok(result.rows[0]?.pids.includes(a))
      }, { timeout: 2000, interval: 20 })
      assert.equal(await head(reader, accountA), prior)
      const independentHead = await head(reader, accountB)
      await reader.query("update bookmarks set title = 'independent' where id = $1", [independent])
      assert.equal(await head(reader, accountB), independentHead + 1n)
      await writerA.query('commit')
      await commit
      assert.deepEqual(await refreshed(reader, accountA, prior), [first, second])

      const feed = await addFeed(reader, accountA)
      const otherFeed = await addFeed(reader, accountB)
      const episode = await addEpisode(reader, accountA, first, feed)
      await addEpisode(reader, accountB, independent, otherFeed)
      const beforeWorker = await head(reader, accountB)
      const beforeCascade = await head(reader, accountA)
      await writerA.query('begin')
      await writerA.query("update episodes set done = true, error = 'timed out' where not done and created_at < now() - interval '7 days'")
      const deletion = writerB.query('delete from podcast_feeds where id = $1', [feed])
      deletion.catch(() => {})
      await writerA.query('commit')
      await deletion
      assert.deepEqual(await refreshed(reader, accountB, beforeWorker), [independent])
      assert.deepEqual(await refreshed(reader, accountA, beforeCascade), [first])
      assert.deepEqual(await tombstones(reader, accountA), [
        { resource_type: 'episode', resource_id: episode, bookmark_id: first },
        { resource_type: 'feed', resource_id: feed, bookmark_id: null },
      ])
    } finally {
      await writerA.query('rollback')
      await writerB.query('rollback')
    }
  })

  await t.test('bootstrap and bounded delta converge under writes and enforce cursor scope', async t => {
    const db = await connect(fixture.databaseUrl, t)
    const app = await createApp({
      ...config({
        DATABASE_URL: fixture.databaseUrl,
        REDIS_CACHE_URL: fixture.redisUrl,
        JWT_SECRET: 'test-sync-jwt-key',
        COOKIE_SECRET: 'test-sync-cookie-key',
        METRICS: 0,
      }),
      dotEnvPath: false,
      serverOptions: { logger: false },
    })
    t.after(() => app.close())
    const account = await addAccount(db)
    const foreign = await addAccount(db)
    const first = await addBookmark(db, account.id, '00000000-0000-4000-8000-000000000010')
    const mid = await addBookmark(db, account.id, '00000000-0000-4000-8000-000000000020')
    const last = await addBookmark(db, account.id, '00000000-0000-4000-8000-000000000030')
    await db.query('update bookmarks set sensitive = true where id = $1', [first])
    const archive = await addArchive(db, account.id, first)
    const feed = await addFeed(db, account.id)
    const episode = await addEpisode(db, account.id, first, feed)
    await addArchive(db, foreign.id, first)
    await addBookmark(db, foreign.id)

    /** @param {typeof account} user */
    async function auth (user) {
      const jti = randomUUID()
      await db.query("insert into auth_tokens (jti, owner_id, source) values ($1, $2, 'web')", [jti, user.id])
      return { authorization: `Bearer ${app.jwt.sign({ ...user, jti })}` }
    }

    const headers = await auth(account)
    const foreignHeaders = await auth(foreign)
    const base = '/api/delta'
    assert.equal((await app.inject(`${base}/bootstrap`)).statusCode, 401)
    const emptyHeaders = await auth(await addAccount(db))
    const empty = await app.inject({ url: `${base}/bootstrap`, headers: emptyHeaders })
    assert.equal(empty.statusCode, 200, empty.body)
    /** @type {SyncBootstrap} */
    const emptyLibrary = empty.json()
    assert.deepEqual(emptyLibrary.bookmarks, [])
    assert.equal(emptyLibrary.next_page_token, null)
    const initialResponse = await app.inject({ url: `${base}/bootstrap?per_page=1`, headers })
    assert.equal(initialResponse.statusCode, 200, initialResponse.body)
    assert.equal(initialResponse.headers['cache-control'], 'private, no-store')
    /** @type {SyncBootstrap} */
    const initial = initialResponse.json()
    const initialBookmark = initial.bookmarks[0]
    assert.ok(initialBookmark && initial.next_page_token)
    assert.equal(initialBookmark.id, first)
    assert.equal(initialBookmark.sensitive, true)
    assert.deepEqual(initialBookmark.archives.map(a => a.id), [archive])
    assert.deepEqual(initialBookmark.episodes.map(e => e.id), [episode])
    for (const excluded of ['archive body', 'private-media', 'private embed', feed]) {
      assert.equal(initialResponse.body.includes(excluded), false)
    }

    const early = await addBookmark(db, account.id, '00000000-0000-4000-8000-000000000005')
    await db.query("update bookmarks set title = 'first edit' where id = $1", [first])
    const webDelete = await app.inject({ method: 'DELETE', url: `/api/bookmarks/${mid}`, headers })
    assert.equal(webDelete.statusCode, 202, webDelete.body)
    const moreResponse = await app.inject({
      url: `${base}/bootstrap?page_token=${initial.next_page_token}&per_page=1`, headers,
    })
    assert.equal(moreResponse.statusCode, 200, moreResponse.body)
    /** @type {SyncBootstrap} */
    const more = moreResponse.json()
    assert.deepEqual(more.bookmarks.map(b => b.id), [last])
    assert.equal(more.next_page_token, null)
    assert.equal(more.cursor, initial.cursor)

    /** @param {string} cursor */
    async function changes (cursor) {
      const response = await app.inject({ url: `${base}/changes?per_page=1&cursor=${cursor}`, headers })
      assert.equal(response.statusCode, 200, response.body)
      /** @type {SyncChanges} */
      const body = response.json()
      return body
    }

    const firstPage = await changes(initial.cursor)
    assert.deepEqual(await changes(initial.cursor), firstPage)
    assert.equal(firstPage.has_more, true)
    assert.equal(firstPage.changes[0]?.op === 'upsert' && firstPage.changes[0].bookmark.id, early)
    const webEdit = await app.inject({
      method: 'PUT', url: `/api/bookmarks/${first}`, headers, payload: { title: 'final edit', tags: ['Reading'] },
    })
    assert.equal(webEdit.statusCode, 200, webEdit.body)
    const bounded = await changes(firstPage.next_cursor)
    assert.deepEqual(bounded.changes, [{ op: 'delete', bookmark_id: mid }])
    assert.equal(bounded.has_more, false)
    const following = await changes(bounded.next_cursor)
    assert.equal(following.changes.length, 1)
    const upsert = following.changes[0]
    assert.ok(upsert?.op === 'upsert')
    assert.equal(upsert.bookmark.title, 'final edit')
    assert.deepEqual(upsert.bookmark.tags, ['Reading'])
    assert.equal(following.has_more, false)

    await db.query('begin')
    await db.query('update sync_cursor_keys set active = false where active')
    await db.query('insert into sync_cursor_keys default values')
    await db.query('commit')
    const afterRotation = await changes(following.next_cursor)
    assert.deepEqual(afterRotation.changes, [])
    assert.notEqual(afterRotation.next_cursor, following.next_cursor)

    for (const request of [
      { url: `${base}/changes?cursor=${initial.cursor}`, headers: foreignHeaders },
      { url: `${base}/changes?cursor=${initial.cursor}A`, headers },
      { url: `${base}/changes?cursor=${initial.next_page_token}`, headers },
      { url: `${base}/bootstrap?page_token=${initial.next_page_token}`, headers: foreignHeaders },
    ]) {
      const invalid = await app.inject(request)
      assert.equal(invalid.statusCode, 400, invalid.body)
      assert.equal(invalid.json().code, 'invalid_sync_cursor')
    }
    assert.equal((await app.inject({ url: `${base}/bootstrap?per_page=201`, headers })).statusCode, 400)

    await db.query('update sync_heads set generation = generation + 1 where owner_id = $1', [account.id])
    for (const url of [
      `${base}/changes?cursor=${afterRotation.next_cursor}`,
      `${base}/bootstrap?page_token=${initial.next_page_token}`,
    ]) {
      const reset = await app.inject({ url, headers })
      assert.equal(reset.statusCode, 410, reset.body)
      assert.equal(reset.json().code, 'sync_reset_required')
    }

    await t.test('retains edit receipts and applies independent fields and tags', async () => {
      const url = `${base}/mutations`
      /** @param {BookmarkEdit} payload @param {typeof headers} [authorization] */
      const mutate = (payload, authorization = headers) => app.inject({
        method: 'POST', url, headers: authorization, payload,
      })
      const editUrl = `/api/bookmarks/${first}`
      const web = await app.inject({
        method: 'PUT', url: editUrl, headers, payload: { note: 'web note' },
      })
      assert.equal(web.statusCode, 200, web.body)
      const webTags = await app.inject({
        method: 'PUT', url: editUrl, headers, payload: { tags: ['Reading', 'Web'] },
      })
      assert.equal(webTags.statusCode, 200, webTags.body)
      const before = await head(db, account.id)
      /** @type {BookmarkEdit} */
      const payload = {
        kind: 'bookmark_edit',
        operation_id: randomUUID(),
        bookmark_id: first,
        fields: {
          note: { base: 'original note', value: 'offline note' },
          starred: { base: false, value: true },
          summary: { base: null, value: null },
        },
        tags: [{ name: 'Offline', present: true }, { name: 'reading', present: false }],
      }
      assert.equal((await app.inject({ method: 'POST', url, payload })).statusCode, 401)
      // Two concurrent attempts with the same ID return the same committed result.
      const [firstAttempt, replay] = await Promise.all([mutate(payload), mutate(payload)])
      const expected = {
        operation_id: payload.operation_id,
        bookmark_id: first,
        outcome: 'processed',
        fields: { note: 'conflict', starred: 'applied', summary: 'already_applied' },
        tags: ['applied', 'applied'],
      }
      for (const response of [firstAttempt, replay]) {
        assert.equal(response.statusCode, 200, response.body)
        assert.equal(response.headers['cache-control'], 'private, no-store')
        assert.deepEqual(response.json(), expected)
      }
      // One bookmark projection and one tombstone for the pruned Reading tag.
      const afterEdit = await head(db, account.id)
      assert.equal(afterEdit, before + 2n)
      assert.deepEqual(await refreshed(db, account.id, before), [first])
      const libraryResponse = await app.inject({ url: `${base}/bootstrap`, headers })
      /** @type {SyncBootstrap} */
      const library = libraryResponse.json()
      const bookmark = library.bookmarks.find(bookmark => bookmark.id === first)
      assert.ok(bookmark)
      assert.equal(bookmark.note, 'web note')
      assert.equal(bookmark.starred, true)
      assert.deepEqual(bookmark.tags, ['Offline', 'Web'])

      const already = await mutate({
        ...payload,
        operation_id: randomUUID(),
        fields: { starred: { base: false, value: true } },
        tags: [{ name: 'offline', present: true }],
      })
      assert.equal(already.statusCode, 200, already.body)
      assert.deepEqual(already.json().tags, ['already_applied'])
      assert.equal(await head(db, account.id), afterEdit)
      assert.equal((await mutate({ ...payload, fields: { note: { base: 'web note', value: null } } })).statusCode, 409)
      assert.equal((await mutate({
        ...payload,
        operation_id: randomUUID(),
        tags: [{ name: 'Offline', present: true }, { name: 'offline', present: false }],
      })).statusCode, 400)

      const rolledBack = randomUUID()
      await assert.rejects(app.pg.transact(async client => {
        const result = await syncEdit(client, account.id, {
          kind: 'bookmark_edit',
          operation_id: rolledBack,
          bookmark_id: first,
          fields: { note: { base: 'web note', value: 'rollback' } },
        })
        assert.equal(result.kind, 'receipt')
        assert.equal(result.receipt.fields.note, 'applied')
        throw new Error('fixture rollback')
      }), /fixture rollback/)
      assert.equal((await db.query('select 1 from sync_mutation_receipts where operation_id = $1', [rolledBack])).rowCount, 0)
      assert.equal(await head(db, account.id), afterEdit)

      const [clear, replace] = await Promise.all([null, 'new note'].map(value => mutate({
        kind: 'bookmark_edit',
        operation_id: randomUUID(),
        bookmark_id: first,
        fields: { note: { base: 'web note', value } },
      })))
      assert.ok(clear && replace)
      for (const response of [clear, replace]) assert.equal(response.statusCode, 200, response.body)
      assert.deepEqual([clear.json().fields.note, replace.json().fields.note].sort(), ['applied', 'conflict'])
      assert.deepEqual((await mutate(payload)).json(), expected)

      const foreignAttempt = await mutate(payload, foreignHeaders)
      assert.equal(foreignAttempt.statusCode, 200, foreignAttempt.body)
      assert.equal(foreignAttempt.json().outcome, 'bookmark_missing')
      const deleted = await app.inject({ method: 'DELETE', url: editUrl, headers })
      assert.equal(deleted.statusCode, 202, deleted.body)
      const afterDelete = await mutate({ ...payload, operation_id: randomUUID() })
      assert.equal(afterDelete.statusCode, 200, afterDelete.body)
      assert.deepEqual(afterDelete.json().fields, {})
      assert.equal(afterDelete.json().outcome, 'bookmark_missing')
      assert.deepEqual((await mutate(payload)).json(), expected)
      assert.ok((await tombstones(db, account.id)).some(row => row.resource_id === first))

      await db.query('delete from users where id = $1', [account.id])
      assert.equal((await db.query('select 1 from sync_mutation_receipts where owner_id = $1', [account.id])).rowCount, 0)
    })
  })
})
