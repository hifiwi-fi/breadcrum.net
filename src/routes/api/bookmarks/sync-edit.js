import SQL from '@nearform/sql'
import { bookmarkScalarAssignments } from '#resources/bookmarks/bookmark-scalar-assignments.js'
import { bookmarkReceipt } from './sync-receipt.js'

/**
 * @import { QueryResult } from 'pg'
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '#resources/types/pg-client.js'
 * @import { BookmarkEditValues, BookmarkSyncUpdate, BookmarkSyncReceipt } from './schemas/bookmark-sync.js'
 * @typedef {Required<BookmarkEditValues>} EditableBookmark
 */

const scalarKeys = new Set(['title', 'note', 'summary', 'starred', 'toread', 'sensitive'])

/**
 * @param {PgClient} client
 * @param {FastifyInstance['httpErrors']} errors
 * @param {string} ownerId
 * @param {string} operationId
 * @param {string} bookmarkId
 * @param {BookmarkSyncUpdate} body
 */
export async function syncEdit (client, errors, ownerId, operationId, bookmarkId, body) {
  const { sync, ...values } = body
  if (!sync) throw errors.badRequest('Idempotent edits require sync.base.')
  const fields = Object.keys(values)
  const tags = sync.tags ?? []
  if ((!fields.length && !tags.length) || Object.keys(sync.base).length !== fields.length ||
      fields.some(field => !scalarKeys.has(field) || !Object.hasOwn(sync.base, field))) {
    throw errors.badRequest('Supply a starting value for each changed scalar field, and use sync.tags for tag changes.')
  }

  /** @type {QueryResult<{ name: string, present: boolean, position: number, occurrences: number }>} */
  const tagIntents = await client.query(SQL`
    select name, present, position::integer, count(*) over (partition by name)::integer as occurrences
    from unnest(${tags.map(tag => tag.name)}::citext[], ${tags.map(tag => tag.present)}::boolean[])
      with ordinality as intents(name, present, position)
    order by name, position
  `)
  if (tagIntents.rows.some(tag => tag.occurrences > 1)) {
    throw errors.badRequest('Each tag membership may be edited only once per operation.')
  }

  /** @type {QueryResult<EditableBookmark>} */
  const result = await client.query(SQL`
    select title, note, summary, starred, toread, sensitive from bookmarks
    where owner_id = ${ownerId} and id = ${bookmarkId}
    for no key update
  `)
  const bookmark = result.rows[0]
  const receipt = bookmarkReceipt(operationId, bookmarkId, bookmark ? 'processed' : 'bookmark_missing')
  if (bookmark) {
    await editScalars(client, ownerId, bookmarkId, bookmark, values, sync.base, receipt.fields)
    for (const { name, present, position } of tagIntents.rows) {
      const changed = await setTagMembership(client, ownerId, bookmarkId, name, present)
      receipt.tags[position - 1] = changed ? 'applied' : 'already_applied'
    }
  }
  return receipt
}

/**
 * @param {PgClient} client
 * @param {string} ownerId
 * @param {string} bookmarkId
 * @param {EditableBookmark} bookmark
 * @param {BookmarkEditValues} values
 * @param {BookmarkEditValues} starting
 * @param {BookmarkSyncReceipt['fields']} outcomes
 */
async function editScalars (client, ownerId, bookmarkId, bookmark, values, starting, outcomes) {
  /**
   * @template T
   * @param {keyof EditableBookmark} field
   * @param {T} current
   * @param {T | undefined} base
   * @param {T | undefined} value
   */
  function resolve (field, current, base, value) {
    if (value === undefined) return undefined
    if (current === value) outcomes[field] = 'already_applied'
    else if (current === base) {
      outcomes[field] = 'applied'
      return value
    } else outcomes[field] = 'conflict'
    return undefined
  }

  const updates = bookmarkScalarAssignments({
    title: resolve('title', bookmark.title, starting.title, values.title),
    note: resolve('note', bookmark.note, starting.note, values.note),
    summary: resolve('summary', bookmark.summary, starting.summary, values.summary),
    starred: resolve('starred', bookmark.starred, starting.starred, values.starred),
    toread: resolve('toread', bookmark.toread, starting.toread, values.toread),
    sensitive: resolve('sensitive', bookmark.sensitive, starting.sensitive, values.sensitive),
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
