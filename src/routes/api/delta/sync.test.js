import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { Client } from 'pg'
import { config, createApp } from '#test/helper.js'
import { integrationFixture } from '#test/integration-fixture.js'
import { syncEdit } from '../bookmarks/sync-edit.js'
import { withSyncReceipt } from '#resources/sync/sync-receipt.js'

/**
 * @import { TestContext } from 'node:test'
 * @import { QueryResult } from 'pg'
 * @import { SyncBootstrap, SyncChanges } from './sync-schemas.js'
 * @import { BookmarkSyncUpdate } from '../bookmarks/schemas/bookmark-sync.js'
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
    const paths = app.swagger().paths
    /** @param {string} url */
    const path = url => paths?.[url] ?? paths?.[`${url}/`]
    for (const route of [
      path('/api/bookmarks')?.put,
      path('/api/bookmarks/{id}')?.put,
      path('/api/bookmarks/{id}')?.delete,
      path('/api/archives/{archive_id}')?.delete,
    ]) {
      assert.ok(route?.description, `OpenAPI paths: ${Object.keys(paths ?? {}).filter(url => url.includes('bookmark')).join(', ')}`)
      assert.doesNotMatch(route.description, /alpha/i)
      assert.ok(route.parameters?.some(parameter => 'name' in parameter &&
        parameter.name === 'idempotency-key' && /Alpha \(unstable\)/.test(parameter.description ?? '')))
    }
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
    assert.equal(initialResponse.headers['breadcrum-sync-writes'], 'bookmark-edit, archive-capture, archive-delete')
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
      const url = `/api/bookmarks/${first}`
      /** @param {BookmarkSyncUpdate} payload @param {string} [key] @param {typeof headers} [authorization] */
      const mutate = (payload, key = randomUUID(), authorization = headers) => app.inject({
        method: 'PUT', url, headers: { ...authorization, 'idempotency-key': key }, payload,
      })
      const web = await app.inject({
        method: 'PUT', url, headers, payload: { note: 'web note' },
      })
      assert.equal(web.statusCode, 200, web.body)
      assert.equal(web.json().status, 'updated')
      assert.equal(web.json().sync, undefined)
      const webTags = await app.inject({
        method: 'PUT', url, headers, payload: { tags: ['Reading', 'Web'] },
      })
      assert.equal(webTags.statusCode, 200, webTags.body)

      const before = await head(db, account.id)
      const operationId = randomUUID()
      /** @type {BookmarkSyncUpdate} */
      const payload = {
        note: 'offline note',
        starred: true,
        summary: null,
        sync: {
          base: { note: 'original note', starred: false, summary: null },
          tags: [{ name: 'Offline', present: true }, { name: 'reading', present: false }],
        },
      }
      assert.equal((await app.inject({ method: 'PUT', url, payload })).statusCode, 401)
      assert.equal((await app.inject({ method: 'PUT', url, headers, payload })).statusCode, 400)
      assert.equal((await mutate({ note: 'missing base' })).statusCode, 400)
      assert.equal((await mutate(payload, 'invalid key')).statusCode, 400)
      assert.equal((await app.inject({ method: 'POST', url: `${base}/mutations`, headers })).statusCode, 404)
      const [firstAttempt, replay] = await Promise.all([mutate(payload, operationId), mutate(payload, operationId)])
      const expected = {
        operation_id: operationId,
        bookmark_id: first,
        outcome: 'processed',
        fields: { note: 'conflict', starred: 'applied', summary: 'already_applied' },
        tags: ['applied', 'applied'],
      }
      for (const response of [firstAttempt, replay]) {
        assert.equal(response.statusCode, 200, response.body)
        assert.equal(response.headers['cache-control'], 'private, no-store')
        assert.deepEqual(response.json(), { sync: expected })
      }
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
        starred: true,
        sync: { base: { starred: false }, tags: [{ name: 'offline', present: true }] },
      })
      assert.equal(already.statusCode, 200, already.body)
      assert.deepEqual(already.json().sync.tags, ['already_applied'])
      assert.equal(await head(db, account.id), afterEdit)
      assert.equal((await mutate({ ...payload, note: 'different note' }, operationId)).statusCode, 409)
      assert.equal((await mutate({
        sync: { base: {}, tags: [{ name: 'Offline', present: true }, { name: 'offline', present: false }] },
      })).statusCode, 400)

      const rolledBack = randomUUID()
      await assert.rejects(app.pg.transact(async client => {
        const update = { note: 'rollback', sync: { base: { note: 'web note' } } }
        const receipt = await withSyncReceipt(
          client, app.httpErrors, account.id, rolledBack, ['edit', first, update],
          id => syncEdit(client, app.httpErrors, account.id, id, first, update)
        )
        assert.equal(receipt.fields.note, 'applied')
        throw new Error('fixture rollback')
      }), /fixture rollback/)
      assert.equal((await db.query('select 1 from sync_mutation_receipts where operation_id = $1', [rolledBack])).rowCount, 0)
      assert.equal(await head(db, account.id), afterEdit)

      const alternatives = await Promise.all([null, 'new note'].map(note => mutate({
        note, sync: { base: { note: 'web note' } },
      })))
      for (const response of alternatives) assert.equal(response.statusCode, 200, response.body)
      assert.deepEqual(alternatives.map(response => response.json().sync.fields.note).sort(), ['applied', 'conflict'])
      assert.deepEqual((await mutate(payload, operationId)).json(), { sync: expected })

      const foreignAttempt = await mutate(payload, operationId, foreignHeaders)
      assert.equal(foreignAttempt.statusCode, 200, foreignAttempt.body)
      assert.equal(foreignAttempt.json().sync.outcome, 'bookmark_missing')
      const deleted = await app.inject({ method: 'DELETE', url, headers })
      assert.equal(deleted.statusCode, 202, deleted.body)
      assert.deepEqual(deleted.json(), { status: 'ok' })
      const afterDelete = await mutate(payload)
      assert.equal(afterDelete.statusCode, 200, afterDelete.body)
      assert.deepEqual(afterDelete.json().sync.fields, {})
      assert.equal(afterDelete.json().sync.outcome, 'bookmark_missing')
      assert.deepEqual((await mutate(payload, operationId)).json(), { sync: expected })
      assert.ok((await tombstones(db, account.id)).some(row => row.resource_id === first))
    })

    await t.test('retains archive capture and delete receipts with one capture job', async t => {
      const bookmarkId = await addBookmark(db, account.id)
      const captureUrl = `/api/bookmarks/${bookmarkId}?exact_url=true`
      const archiveURL = 'https://example.com/archive-source'
      const payload = { createArchive: { url: archiveURL } }
      const captureKey = randomUUID()
      /** @param {string} [key] @param {typeof headers} [authorization] */
      const capture = (key = captureKey, authorization = headers) => app.inject({
        method: 'PUT', url: captureUrl, headers: { ...authorization, 'Idempotency-Key': key }, payload,
      })
      const queue = app.pgboss.queues.resolveArchiveQ
      const originalSend = queue.send
      let rolledBackJob
      const mock = t.mock.method(queue, 'send', /** @type {typeof originalSend} */ (async request => {
        rolledBackJob = await originalSend.call(queue, request)
        throw new Error('injected failure after archive enqueue')
      }))
      const headBefore = await head(db, account.id)
      const failure = await capture()
      assert.equal(failure.statusCode, 500, failure.body)
      assert.ok(rolledBackJob)
      mock.mock.restore()
      const jobs = () => app.pgboss.boss.findJobs(queue.name, { data: { url: archiveURL } })
      assert.deepEqual(await jobs(), [])
      assert.equal(await head(db, account.id), headBefore)
      assert.equal((await db.query('select 1 from archives where bookmark_id = $1', [bookmarkId])).rowCount, 0)
      assert.equal((await db.query('select 1 from sync_mutation_receipts where operation_id = $1', [captureKey])).rowCount, 0)

      const [first, retry] = await Promise.all([capture(), capture()])
      assert.equal(first.statusCode, 200, first.body)
      assert.equal(retry.statusCode, 200, retry.body)
      const receipt = first.json().sync
      const archiveId = receipt.archive_id
      assert.ok(archiveId)
      assert.deepEqual(receipt, {
        operation_id: captureKey,
        bookmark_id: bookmarkId,
        archive_id: archiveId,
        outcome: 'archive_created',
      })
      assert.deepEqual(retry.json(), { sync: receipt })
      assert.equal(first.headers['cache-control'], 'private, no-store')
      assert.equal((await jobs()).length, 1)
      assert.deepEqual((await db.query('select url from archives where bookmark_id = $1', [bookmarkId])).rows, [{ url: archiveURL }])
      const collision = await app.inject({
        method: 'PUT',
        url: captureUrl,
        headers: { ...headers, 'Idempotency-Key': captureKey },
        payload: { createArchive: true },
      })
      assert.equal(collision.statusCode, 409, collision.body)
      const mixed = await app.inject({
        method: 'PUT',
        url: captureUrl,
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        payload: { ...payload, starred: true },
      })
      assert.equal(mixed.statusCode, 400, mixed.body)
      const foreignCapture = await capture(captureKey, foreignHeaders)
      assert.equal(foreignCapture.statusCode, 200, foreignCapture.body)
      assert.deepEqual(foreignCapture.json().sync, {
        operation_id: captureKey,
        bookmark_id: bookmarkId,
        archive_id: null,
        outcome: 'bookmark_missing',
      })

      const deleteUrl = `/api/archives/${archiveId}`
      /** @param {string} key @param {typeof headers} [authorization] */
      const remove = (key, authorization = headers) => app.inject({
        method: 'DELETE', url: deleteUrl, headers: { ...authorization, 'Idempotency-Key': key },
      })
      assert.equal((await remove(captureKey)).statusCode, 409)
      const foreignDelete = await remove(randomUUID(), foreignHeaders)
      assert.equal(foreignDelete.statusCode, 200, foreignDelete.body)
      assert.equal(foreignDelete.json().sync.bookmark_id, null)
      assert.equal(foreignDelete.json().sync.outcome, 'archive_missing')

      const snapshot = await app.inject({ url: `${base}/bootstrap`, headers })
      /** @type {SyncBootstrap} */
      const initial = snapshot.json()
      assert.deepEqual(initial.bookmarks.find(row => row.id === bookmarkId)?.archives.map(row => row.id), [archiveId])
      const deleteKey = randomUUID()
      const deleted = await remove(deleteKey)
      assert.equal(deleted.statusCode, 200, deleted.body)
      assert.deepEqual(deleted.json().sync, {
        operation_id: deleteKey,
        bookmark_id: bookmarkId,
        archive_id: archiveId,
        outcome: 'archive_deleted',
      })
      assert.deepEqual((await remove(deleteKey)).json(), deleted.json())
      assert.equal((await remove(randomUUID())).json().sync.outcome, 'archive_missing')
      assert.deepEqual((await capture()).json(), { sync: receipt })
      assert.equal((await jobs()).length, 1)
      assert.equal((await tombstones(db, account.id)).filter(row => row.resource_id === archiveId).length, 1)
      const next = await app.inject({ url: `${base}/changes?cursor=${initial.cursor}`, headers })
      /** @type {SyncChanges} */
      const delta = next.json()
      const refreshedBookmark = delta.changes.find(change => change.op === 'upsert' && change.bookmark.id === bookmarkId)
      assert.ok(refreshedBookmark?.op === 'upsert')
      assert.deepEqual(refreshedBookmark.bookmark.archives, [])

      const defaultCapture = await app.inject({
        method: 'PUT',
        url: captureUrl,
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        payload: { createArchive: true },
      })
      assert.equal(defaultCapture.statusCode, 200, defaultCapture.body)
      const defaultArchiveId = defaultCapture.json().sync.archive_id
      assert.deepEqual((await db.query('select url from archives where id = $1', [defaultArchiveId])).rows, [
        { url: `https://example.com/${bookmarkId}` },
      ])
      assert.equal((await app.inject({
        method: 'DELETE', url: `/api/archives/${defaultArchiveId}`, headers,
      })).statusCode, 202)

      const ordinaryCapture = await app.inject({
        method: 'PUT', url: captureUrl, headers, payload: { createArchive: true },
      })
      assert.equal(ordinaryCapture.statusCode, 200, ordinaryCapture.body)
      assert.equal(ordinaryCapture.json().status, 'updated')
      assert.equal(ordinaryCapture.json().sync, undefined)
      /** @type {QueryResult<{id: string}>} */
      const remaining = await db.query('select id from archives where bookmark_id = $1', [bookmarkId])
      const ordinaryArchive = remaining.rows[0]
      assert.ok(ordinaryArchive)
      const ordinaryDeleteUrl = `/api/archives/${ordinaryArchive.id}`
      const ordinaryDelete = await app.inject({ method: 'DELETE', url: ordinaryDeleteUrl, headers })
      assert.equal(ordinaryDelete.statusCode, 202, ordinaryDelete.body)
      assert.equal((await app.inject({ method: 'DELETE', url: ordinaryDeleteUrl, headers })).statusCode, 404)
    })

    await t.test('recovers canonical create and delete receipts and queues resolution once', async t => {
      const createUrl = '/api/bookmarks?exact_url=true&meta=true&episode=false&archive=false'
      const payload = { url: 'https://example.com/queued', title: 'Queued', starred: true, tags: ['Read'] }
      const createId = randomUUID()
      /** @param {string} [key] */
      const create = (key = createId) => app.inject({
        method: 'PUT', url: createUrl, headers: { ...headers, 'Idempotency-Key': key }, payload,
      })
      const queue = app.pgboss.queues.resolveBookmarkQ
      const originalSend = queue.send
      let rolledBackJob
      const mock = t.mock.method(queue, 'send', /** @type {typeof originalSend} */ (async request => {
        rolledBackJob = await originalSend.call(queue, request)
        throw new Error('injected failure after enqueue')
      }))
      const failed = await create()
      assert.equal(failed.statusCode, 500, failed.body)
      assert.ok(rolledBackJob)
      mock.mock.restore()
      assert.equal((await db.query('select 1 from bookmarks where owner_id = $1 and url = $2', [account.id, payload.url])).rowCount, 0)
      assert.equal((await db.query('select 1 from sync_mutation_receipts where operation_id = $1', [createId])).rowCount, 0)
      const jobs = () => app.pgboss.boss.findJobs(queue.name, { data: { url: payload.url } })
      assert.deepEqual(await jobs(), [])

      const [one, two, three] = await Promise.all([create(), create(), create(randomUUID())])
      for (const result of [one, two, three]) assert.equal(result.statusCode, 200, result.body)
      const receipt = one.json().sync
      assert.deepEqual(two.json(), { sync: receipt })
      assert.deepEqual([receipt.outcome, three.json().sync.outcome].sort(), ['created', 'existing'])
      assert.equal(three.json().sync.bookmark_id, receipt.bookmark_id)
      assert.equal((await jobs()).length, 1)
      assert.deepEqual((await db.query('select starred from bookmarks where id = $1', [receipt.bookmark_id])).rows, [{ starred: true }])
      const ordinary = await app.inject({ method: 'PUT', url: createUrl, headers, payload })
      assert.equal(ordinary.statusCode, 200, ordinary.body)
      assert.equal(ordinary.json().status, 'nochange')
      assert.equal(ordinary.json().data.id, receipt.bookmark_id)
      assert.equal(ordinary.json().sync, undefined)

      const deleteUrl = `/api/bookmarks/${receipt.bookmark_id}`
      /** @param {string} key */
      const remove = key => app.inject({
        method: 'DELETE', url: deleteUrl, headers: { ...headers, 'Idempotency-Key': key },
      })
      assert.equal((await remove(createId)).statusCode, 409)
      const deleteId = randomUUID()
      const deleted = await remove(deleteId)
      assert.equal(deleted.statusCode, 200, deleted.body)
      assert.equal(deleted.json().sync.outcome, 'deleted')
      assert.deepEqual((await remove(deleteId)).json(), deleted.json())
      assert.equal((await remove(randomUUID())).json().sync.outcome, 'bookmark_missing')
      assert.deepEqual((await create()).json(), { sync: receipt })
      assert.equal((await tombstones(db, account.id)).filter(row => row.resource_id === receipt.bookmark_id).length, 1)

      await db.query('delete from users where id = $1', [account.id])
      assert.equal((await db.query('select 1 from sync_mutation_receipts where owner_id = $1', [account.id])).rowCount, 0)
    })
  })
})
