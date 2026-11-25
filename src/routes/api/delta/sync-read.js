import SQL from '@nearform/sql'

/**
 * @import { QueryResult } from 'pg'
 * @import { PgClient } from '#resources/types/pg-client.js'
 * @import { SyncBookmark, SyncChanges } from './sync-schemas.js'
 * @import { CursorKey } from './sync-cursor.js'
 */

/** @param {PgClient} client @param {string} ownerId */
export async function readSyncState (client, ownerId) {
  /** @type {QueryResult<{ generation: number, revision: string, id: string, secret: Buffer }>} */
  const result = await client.query(SQL`
    select coalesce(h.generation, 1) as generation, coalesce(h.revision, 0)::text as revision, k.id, k.secret
    from sync_cursor_keys k left join sync_heads h on h.owner_id = ${ownerId}
    where k.active
  `)
  const row = result.rows[0]
  if (!row) throw new Error('The sync cursor signing key is missing.')
  /** @type {CursorKey} */
  const key = { id: row.id, secret: row.secret }
  return { owner: { ownerId, generation: row.generation }, revision: row.revision, key }
}

/**
 * @param {PgClient} client
 * @param {string} ownerId
 * @param {string | null} after
 * @param {number} pageSize
 */
export async function readBootstrapPage (client, ownerId, after, pageSize) {
  /** @type {QueryResult<{ id: string }>} */
  const result = await client.query(SQL`
    select id from bookmarks
    where owner_id = ${ownerId}
    ${after ? SQL`and id > ${after}` : SQL``}
    order by id
    fetch first ${pageSize + 1} rows only
  `)
  const ids = result.rows.slice(0, pageSize).map(row => row.id)
  const bookmarks = await readBookmarks(client, ownerId, ids)
  return {
    bookmarks: ids.map(id => requiredBookmark(bookmarks, id)),
    nextId: result.rows.length > pageSize ? ids.at(-1) ?? null : null,
  }
}

/**
 * @param {PgClient} client
 * @param {string} ownerId
 * @param {string} after
 * @param {string} bound
 * @param {number} pageSize
 */
export async function readChangesPage (client, ownerId, after, bound, pageSize) {
  /** @type {QueryResult<{ id: string, revision: string, deleted: boolean }>} */
  const result = await client.query(SQL`
    select bookmark_id as id, revision, false as deleted
    from sync_bookmark_changes
    where owner_id = ${ownerId} and revision > ${after}::bigint and revision <= ${bound}::bigint
    union all
    select resource_id as id, revision, true as deleted
    from sync_tombstones
    where owner_id = ${ownerId} and resource_type = 'bookmark'
      and revision > ${after}::bigint and revision <= ${bound}::bigint
    order by revision
    fetch first ${pageSize + 1} rows only
  `)
  const page = result.rows.slice(0, pageSize)
  const bookmarks = await readBookmarks(client, ownerId, page.filter(row => !row.deleted).map(row => row.id))
  /** @type {SyncChanges['changes']} */
  const changes = page.map(row => row.deleted
    ? { op: 'delete', bookmark_id: row.id }
    : { op: 'upsert', bookmark: requiredBookmark(bookmarks, row.id) })
  const hasMore = result.rows.length > pageSize
  return { changes, hasMore, after: hasMore ? page.at(-1)?.revision ?? bound : bound }
}

/** @param {PgClient} client @param {string} ownerId @param {string[]} ids */
async function readBookmarks (client, ownerId, ids) {
  if (ids.length === 0) return new Map()
  // Explicit projection: the regular bookmark read includes media and feed data.
  /** @type {QueryResult<{ bookmark: SyncBookmark }>} */
  const result = await client.query(SQL`
    select jsonb_build_object(
      'id', b.id,
      'url', b.url,
      'title', b.title,
      'note', b.note,
      'summary', b.summary,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'sensitive', b.sensitive,
      'starred', b.starred,
      'toread', b.toread,
      'done', b.done,
      'archive_urls', b.archive_urls,
      'tags', array(
        select t.name::text
        from bookmarks_tags bt join tags t on t.id = bt.tag_id
        where bt.bookmark_id = b.id and t.owner_id = b.owner_id
        order by t.name, t.id
      ),
      'archives', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id,
          'url', a.url,
          'title', a.title,
          'site_name', a.site_name,
          'excerpt', a.excerpt,
          'byline', a.byline,
          'created_at', a.created_at,
          'updated_at', a.updated_at,
          'published_time', a.published_time,
          'extraction_method', a.extraction_method,
          'ready', a.ready,
          'done', a.done
        ) order by a.created_at, a.id)
        from archives a where a.bookmark_id = b.id and a.owner_id = b.owner_id
      ), '[]'::jsonb),
      'episodes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', e.id,
          'display_title', coalesce(e.title, b.title, b.url),
          'created_at', e.created_at,
          'updated_at', e.updated_at,
          'published_time', e.published_time,
          'medium', e.medium,
          'author_name', e.author_name,
          'ready', e.ready,
          'done', e.done
        ) order by e.created_at, e.id)
        from episodes e where e.bookmark_id = b.id and e.owner_id = b.owner_id
      ), '[]'::jsonb)
    ) as bookmark
    from bookmarks b where b.owner_id = ${ownerId} and b.id = any(${ids}::uuid[])
  `)
  return new Map(result.rows.map(({ bookmark }) => [bookmark.id, bookmark]))
}

/** @param {Map<string, SyncBookmark>} bookmarks @param {string} id */
function requiredBookmark (bookmarks, id) {
  const bookmark = bookmarks.get(id)
  if (!bookmark) throw new Error('Sync entry has no live bookmark in the same snapshot.')
  return bookmark
}
