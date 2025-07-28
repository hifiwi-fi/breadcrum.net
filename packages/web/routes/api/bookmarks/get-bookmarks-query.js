/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeBookmarkRead } from './schemas/schema-bookmark-read.js'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {GetBookmarksQueryParams & {
 *   fastify: FastifyInstance,
 *   pg?: PgClient
 * }} GetBookmarksParams
 */

/**
 * Retrieves a single bookmark based on the provided query parameters.
 *
 * @function getBookmark
 * @param {GetBookmarksParams} getBookmarksParams - Parameters to shape the query.
 * @returns {Promise<TypeBookmarkRead | undefined >} A bookmark object or null if not found.
 */
export async function getBookmark (getBookmarksParams) {
  const bookmark = (await getBookmarks(getBookmarksParams))[0]
  return bookmark
}

/**
 * Retrieves bookmarks based on the provided query parameters.
 *
 * @function getBookmarks
 * @param {GetBookmarksParams} getBookmarksParams - Parameters to shape the query.
 * @returns {Promise<TypeBookmarkRead[]>} An array of bookmark objects.
 */
export async function getBookmarks (getBookmarksParams) {
  const { fastify, pg, ...getBookmarksQueryParams } = getBookmarksParams
  const client = pg ?? fastify.pg
  const query = getBookmarksQuery(getBookmarksQueryParams)

  const results = await client.query(query)
  /** @type {TypeBookmarkRead[]} */
  const bookmarks = results.rows
  return bookmarks
}

/**
 * @typedef {object} GetBookmarksQueryParams
 * @property {string} ownerId - ID of the owner (required).
 * @property {string} [tag] - Tag associated with the bookmarks.
 * @property {string} [bookmarkId] - Specific ID of the bookmark.
 * @property {string} [before] - Date string to get bookmarks before this date.
 * @property {string} [after] - Date string to get bookmarks after this date.
 * @property {string} [url] - URL of the bookmark.
 * @property {boolean} [sensitive=false] - If true, includes sensitive bookmarks.
 * @property {boolean} [starred] - If true, includes only starred bookmarks.
 * @property {boolean} [toread] - If true, includes only 'to read' bookmarks.
 * @property {number} [perPage] - Limits the number of returned rows.
 * @property {boolean} [fullArchives=false] - If true, includes full archive content in the result.
 */

/**
 * Generates an SQL query to retrieve bookmarks based on the provided criteria.
 *
 * @function getBookmarksQuery
 * @exports
 * @param {GetBookmarksQueryParams} params - Parameters to shape the query.
 * @returns {SQL.SqlStatement} SQL template literal representing the bookmarks query.
 * @throws {Error} Throws an error if ownerId is not provided.
 */
export const getBookmarksQuery = ({
  tag,
  ownerId,
  bookmarkId,
  before,
  after,
  url,
  sensitive,
  starred,
  toread,
  perPage,
  fullArchives,
}) => {
  const boomkmarksQuery = SQL`
        with bookmark_page as (
          select bm.*
          from bookmarks bm
          ${tag
            ? SQL`
              left join bookmarks_tags bt
              on bm.id = bt.bookmark_id
              left join tags t
              on t.id = bt.tag_id`
            : SQL``}
          where bm.owner_id = ${ownerId}
          ${bookmarkId ? SQL`and bm.id = ${bookmarkId}` : SQL``}
          ${before ? SQL`and bm.created_at < ${before}` : SQL``}
          ${after ? SQL`and bm.created_at >= ${after}` : SQL``}
          ${url ? SQL`and url = ${url}` : SQL``}
          ${!sensitive ? SQL`and sensitive = false` : SQL``}
          ${starred ? SQL`and starred = true` : SQL``}
          ${toread ? SQL`and toread = true` : SQL``}
          ${tag ? SQL`and t.name = ${tag} and t.owner_id = ${ownerId}` : SQL``}
          order by ${after
            ? SQL`bm.created_at asc, bm.title asc, bm.url asc`
            : SQL`bm.created_at desc, bm.title desc, bm.url desc`
          }
          ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
        ),
        bookark_page_tags_array as (
          ${bookmarkTagsArray({ ownerId })}
        ),
        bookark_page_episodes_array as (
          ${bookmarkEpisodesArray({ ownerId })}
        ),
        archives_array as (
          ${bookmarkArchivesArray({ ownerId, fullArchives })}
        )
        select
          b.id,
          b.url,
          b.title,
          b.note,
          b.created_at,
          b.updated_at,
          b.toread,
          b.sensitive,
          b.starred,
          b.summary,
          coalesce(array_to_json(tag_array), '[]'::json)::jsonb as tags,
          coalesce(episodes, '[]'::jsonb) as episodes,
          coalesce(archives, '[]'::jsonb) as archives,
          b.archive_urls
        from bookmark_page b
        left outer join bookark_page_tags_array
        on bookark_page_tags_array.bookmark_id = b.id
        left outer join bookark_page_episodes_array
        on bookark_page_episodes_array.bookmark_id = b.id
        left outer join archives_array
        on archives_array.bookmark_id = b.id
        order by b.created_at desc, b.title desc, b.url desc
      `

  return boomkmarksQuery
}

/**
 * Generates an SQL query to retrieve an array of tags associated with bookmarks.
 *
 * @function bookmarkTagsArray
 * @param {Object} params - Parameters to shape the query.
 * @param {string} params.ownerId - ID of the owner (required).
 * @returns {SQL.SqlStatement} SQL template literal representing the query for bookmark tags.
 */
export function bookmarkTagsArray ({
  ownerId,
}) {
  return SQL`
    select bm.id as bookmark_id, array_agg(t.name) as tag_array
    from bookmark_page bm
    left outer join bookmarks_tags bt
    on bm.id = bt.bookmark_id
    left outer join tags t
    on t.id = bt.tag_id
    where bm.owner_id = ${ownerId}
    and t.owner_id = ${ownerId}
    group by bm.id
  `
}

/**
 * Generates an SQL query to retrieve an array of episodes associated with bookmarks.
 *
 * @function bookmarkEpisodesArray
 * @param {Object} params - Parameters to shape the query.
 * @param {string} params.ownerId - ID of the owner (required).
 * @returns {SQL.SqlStatement} SQL template literal representing the query for bookmark episodes.
 */
export function bookmarkEpisodesArray ({
  ownerId,
}) {
  return SQL`
    select bm.id as bookmark_id, jsonb_strip_nulls(jsonb_agg(
    case
    when ep.id is null then null
    else jsonb_strip_nulls(jsonb_build_object(
      'id', ep.id,
      'podcast_feed_id', ep.podcast_feed_id,
      'created_at', ep.created_at,
      'updated_at', ep.updated_at,
      'url', ep.url,
      'title', ep.title,
      'display_title', coalesce(ep.title, bm.title),
      'type', ep.type,
      'medium', ep.medium,
      'size_in_bytes', ep.size_in_bytes,
      'duration_in_seconds', ep.duration_in_seconds,
      'mime_type', ep.mime_type,
      'explicit', ep.explicit,
      'author_name', ep.author_name,
      'filename', ep.filename,
      'ext', ep.ext,
      'src_type', ep.src_type,
      'ready', ep.ready,
      'error', ep.error
    ))
    end)
  ) episodes
  from bookmark_page bm
  left outer join episodes ep
  on ep.bookmark_id = bm.id
  where bm.owner_id = ${ownerId}
  and ep.owner_id = ${ownerId}
  group by bm.id
  `
}

/**
 * Generates an SQL query to retrieve an array of archives associated with bookmarks.
 *
 * @function bookmarkArchivesArray
 * @param {Object} params - Parameters to shape the query.
 * @param {boolean} [params.fullArchives=false] - If true, includes full archive content in the result.
 * @param {string} params.ownerId - ID of the owner (required).
 * @returns {SQL.SqlStatement} SQL template literal representing the query for bookmark archives.
 */
export function bookmarkArchivesArray ({
  fullArchives,
  ownerId,
}) {
  return SQL`
    select bm.id as bookmark_id, jsonb_strip_nulls(jsonb_agg(
    case
    when ar.id is null then null
    else jsonb_strip_nulls(jsonb_build_object(
      'id', ar.id,
      'created_at', ar.created_at,
      'updated_at', ar.updated_at,
      'url', ar.url,
      'title', ar.title,
      'site_name', ar.site_name,
      'length', ar.length,
      ${fullArchives ? SQL`'html_content', ar.html_content,` : SQL``}
      'excerpt', ar.excerpt,
      'byline', ar.byline,
      'direction', ar.direction,
      'language', ar.language,
      'extraction_method', ar.extraction_method,
      'ready', ar.ready,
      'error', ar.error
    ))
    end)
  ) archives
  from bookmark_page bm
  left outer join archives ar
  on ar.bookmark_id = bm.id
  where bm.owner_id = ${ownerId}
  and ar.owner_id = ${ownerId}
  group by bm.id
`
}
