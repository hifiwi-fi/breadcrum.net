import { createHash } from 'node:crypto'
import SQL from '@nearform/sql'
import { bookmarkScalarAssignments } from '#resources/bookmarks/bookmark-scalar-assignments.js'

/**
 * @import { QueryResult } from 'pg'
 * @import { PgClient } from '#resources/types/pg-client.js'
 * @import { BookmarkEdit, MutationReceipt } from './mutation-schemas.js'
 * @typedef {{ title: string | null, note: string | null, summary: string | null, starred: boolean, toread: boolean, sensitive: boolean }} EditableBookmark
 */

/**
 * @param {PgClient} client
 * @param {string} ownerId
 * @param {BookmarkEdit} body
 * @returns {Promise<{kind: 'receipt', receipt: MutationReceipt} | {kind: 'account_missing' | 'operation_id_reused' | 'duplicate_tag'}>}
 */
export async function syncEdit (client, ownerId, body) {
  const operationId = body.operation_id.toLowerCase()
  const bookmarkId = body.bookmark_id.toLowerCase()
  const fields = Object.entries(body.fields ?? {}).sort(([left], [right]) => left.localeCompare(right))
  const tags = body.tags ?? []
  const hash = createHash('sha256').update(JSON.stringify([
    'bookmark_edit',
    bookmarkId,
    fields.map(([field, change]) => [field, change.base, change.value]),
    tags.map(tag => [tag.name, tag.present]),
  ])).digest()

  // Protect the receipt's account FK before taking any bookmark or tag locks.
  const owner = await client.query(SQL`select id from users where id = ${ownerId} for key share`)
  if (owner.rowCount === 0) return { kind: 'account_missing' }

  // Serialize the first attempt and its retries without creating a placeholder receipt.
  await client.query(SQL`
    select pg_advisory_xact_lock(hashtextextended(
      'breadcrum:sync-mutation:' || ${ownerId}::uuid::text || ':' || ${operationId}::uuid::text, 0
    ))
  `)
  /** @type {QueryResult<{ request_hash: Buffer, receipt: MutationReceipt }>} */
  const prior = await client.query(SQL`
    select request_hash, receipt from sync_mutation_receipts
    where owner_id = ${ownerId} and operation_id = ${operationId}
  `)
  const existing = prior.rows[0]
  if (existing) {
    if (!existing.request_hash.equals(hash)) return { kind: 'operation_id_reused' }
    return { kind: 'receipt', receipt: existing.receipt }
  }

  /** @type {QueryResult<{ name: string, present: boolean, position: number, occurrences: number }>} */
  const tagIntents = await client.query(SQL`
    select name, present, position::integer, count(*) over (partition by name)::integer as occurrences
    from unnest(${tags.map(tag => tag.name)}::citext[], ${tags.map(tag => tag.present)}::boolean[])
      with ordinality as intents(name, present, position)
    order by name, position
  `)
  if (tagIntents.rows.some(tag => tag.occurrences > 1)) return { kind: 'duplicate_tag' }

  /** @type {QueryResult<EditableBookmark>} */
  const result = await client.query(SQL`
    select title, note, summary, starred, toread, sensitive from bookmarks
    where owner_id = ${ownerId} and id = ${bookmarkId}
    for no key update
  `)
  const bookmark = result.rows[0]
  /** @type {MutationReceipt} */
  const receipt = {
    operation_id: operationId,
    bookmark_id: bookmarkId,
    outcome: bookmark ? 'processed' : 'bookmark_missing',
    fields: {},
    tags: [],
  }
  if (bookmark) {
    await editScalars(client, ownerId, bookmarkId, bookmark, body.fields, receipt.fields)
    for (const { name, present, position } of tagIntents.rows) {
      const changed = await setTagMembership(client, ownerId, bookmarkId, name, present)
      receipt.tags[position - 1] = changed ? 'applied' : 'already_applied'
    }
  }

  await client.query(SQL`
    insert into sync_mutation_receipts (owner_id, operation_id, request_hash, receipt)
    values (${ownerId}, ${operationId}, ${hash}, ${receipt})
  `)
  return { kind: 'receipt', receipt }
}

/**
 * @param {PgClient} client
 * @param {string} ownerId
 * @param {string} bookmarkId
 * @param {EditableBookmark} bookmark
 * @param {BookmarkEdit['fields']} fields
 * @param {MutationReceipt['fields']} outcomes
 */
async function editScalars (client, ownerId, bookmarkId, bookmark, fields, outcomes) {
  if (!fields) return

  /**
   * @template T
   * @param {keyof EditableBookmark} field
   * @param {T} current
   * @param {{ base: T, value: T } | undefined} change
   */
  function resolve (field, current, change) {
    if (!change) return undefined
    if (current === change.value) outcomes[field] = 'already_applied'
    else if (current === change.base) {
      outcomes[field] = 'applied'
      return change.value
    } else outcomes[field] = 'conflict'
    return undefined
  }

  const updates = bookmarkScalarAssignments({
    title: resolve('title', bookmark.title, fields.title),
    note: resolve('note', bookmark.note, fields.note),
    summary: resolve('summary', bookmark.summary, fields.summary),
    starred: resolve('starred', bookmark.starred, fields.starred),
    toread: resolve('toread', bookmark.toread, fields.toread),
    sensitive: resolve('sensitive', bookmark.sensitive, fields.sensitive),
  })
  if (updates.length > 0) {
    await client.query(SQL`
      update bookmarks set ${SQL.glue(updates, ', ')}
      where owner_id = ${ownerId} and id = ${bookmarkId}
    `)
  }
}

/**
 * @param {PgClient} client
 * @param {string} ownerId
 * @param {string} bookmarkId
 * @param {string} name
 * @param {boolean} present
 */
async function setTagMembership (client, ownerId, bookmarkId, name, present) {
  if (!present) {
    const deleted = await client.query(SQL`
      delete from bookmarks_tags bt using tags t
      where bt.bookmark_id = ${bookmarkId}
        and bt.tag_id = t.id and t.owner_id = ${ownerId} and t.name = ${name}::citext
    `)
    return deleted.rowCount === 1
  }

  // Keep the display spelling of an existing tag and pin it through membership insertion.
  const added = await client.query(SQL`
    with tag as (
      insert into tags (name, owner_id)
      select ${name}::citext, ${ownerId}::uuid
      where not exists (
        select 1 from bookmarks_tags bt join tags t on t.id = bt.tag_id
        where bt.bookmark_id = ${bookmarkId} and t.owner_id = ${ownerId} and t.name = ${name}::citext
      )
      on conflict (name, owner_id) do update set name = tags.name
      returning id
    )
    insert into bookmarks_tags (bookmark_id, tag_id)
    select ${bookmarkId}, id from tag
    on conflict (bookmark_id, tag_id) do nothing
  `)
  return added.rowCount === 1
}
