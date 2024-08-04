/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PoolClient } from 'pg'
 * @import { TypeArchiveRead } from './schemas/schema-archive-read.js'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {ArchiveQueryParams & {
 *   fastify: FastifyInstance,
 *   pg?: PoolClient | FastifyInstance['pg']
 * }} GetArchivesParams
 */

/**
 * Retrieves multiple archives based on the provided query parameters.
 *
 * @function getArchives
 * @param {GetArchivesParams} getArchivesParams - Parameters to shape the query.
 * @returns {Promise<TypeArchiveRead[]>} An array of archive objects.
 */
export async function getArchives (getArchivesParams) {
  const { fastify, pg, ...getArchivesQueryParams } = getArchivesParams
  const client = pg ?? fastify.pg
  const query = getArchivesQuery(getArchivesQueryParams)

  const results = await client.query(query)
  return results.rows
}

/**
 * Retrieves a single archive based on the provided query parameters.
 *
 * @function getArchive
 * @param {GetArchivesParams} getArchivesParams - Parameters to shape the query.
 * @returns {Promise<TypeArchiveRead | undefined>} An archive object or undefined if not found.
 */
export async function getArchive (getArchivesParams) {
  const archives = await getArchives(getArchivesParams)
  return archives?.[0]
}

/**
 * @typedef {Object} ArchiveQueryParams
 * @property {boolean | undefined} [fullArchives] - Whether to include full HTML content of the archive.
 * @property {string|number} ownerId - The owner ID to filter the archives and bookmarks.
 * @property {boolean | undefined} [sensitive] - Whether to include sensitive bookmarks.
 * @property {boolean | undefined} [toread] - Whether to include bookmarks marked "to read."
 * @property {boolean | undefined} [starred] - Whether to include starred bookmarks.
 * @property {boolean | undefined} [ready] - Whether the archive is ready.
 * @property {string | undefined } [archiveId] - Specific archive ID to fetch.
 * @property {string | undefined } [bookmarkId] - Specific bookmark ID associated with an archive to fetch.
 * @property {string | undefined } [before] - Timestamp to fetch archives created before this time.
 * @property {string | undefined} [after] - Timestamp to fetch archives created after this time.
 * @property {boolean} [withRank] - Whether to include ranking based on text search.
 * @property {string} [query] - Text search query for ranking.
 * @property {boolean} [includeRank] - Include rank column.
 * @property {string|number} [perPage] - Number of items per page.
 */

/**
 * Generates an SQL query for fetching archive properties based on various filters.
 *
 * @export
 * @param {ArchiveQueryParams} params - The options object containing filter and query properties.
 * @returns {SQL.SqlStatement} The generated SQL query.
 */
export function archivePropsQuery ({
  fullArchives = false,
  ownerId,
  sensitive,
  toread,
  starred,
  ready,
  archiveId,
  bookmarkId,
  before,
  after,
  query,
  includeRank,
}) {
  return SQL`
    select
      ar.id,
      ar.created_at,
      ar.updated_at,
      ${includeRank ? SQL`ts_rank(ar.tsv,  websearch_to_tsquery('english', ${query})) AS rank,` : SQL``}
      ar.url,
      ar.title,
      coalesce (ar.title, bm.title) as display_title,
      ar.site_name,
      ${fullArchives ? SQL`ar.html_content,` : SQL``}
      ar.length,
      ar.excerpt,
      ar.byline,
      ar.direction,
      ar.language,
      ar.extraction_method,
      ar.ready,
      ar.error,
      jsonb_build_object(
        'id', bm.id,
        'url', bm.url,
        'title', bm.title,
        'note', bm.note,
        'created_at', bm.created_at,
        'updated_at', bm.updated_at,
        'starred', bm.starred,
        'toread', bm.toread,
        'sensitive', bm.sensitive
        /* tags? */
      ) as bookmark
    from archives ar
    join bookmarks bm
    on ar.bookmark_id = bm.id
    where ar.owner_id = ${ownerId}
    and bm.owner_id = ${ownerId}
    ${!sensitive ? SQL`and sensitive = false` : SQL``}
    ${toread ? SQL`and toread = true` : SQL``}
    ${starred ? SQL`and starred = true` : SQL``}
    ${ready != null ? SQL`and ready = ${ready}` : SQL``}
    ${archiveId ? SQL`and ar.id = ${archiveId}` : SQL``}
    ${bookmarkId ? SQL`and ar.bookmark_id = ${bookmarkId}` : SQL``}
    ${before ? SQL`and ar.created_at < ${before}` : SQL``}
    ${after ? SQL`and ar.created_at >= ${after}` : SQL``}
  `
}

/**
 * Generates an SQL query for fetching archive properties based on various filters.
 *
 * @export
 * @param {ArchiveQueryParams} params - The options object containing filter and query properties.
 * @returns {SQL.SqlStatement} The generated SQL query.
 */
export function getArchivesQuery ({
  ownerId,
  archiveId,
  bookmarkId,
  before,
  after,
  sensitive,
  toread,
  starred,
  ready,
  perPage,
  fullArchives,
}) {
  const archivesQuery = SQL`
    with archive_page as (
      ${archivePropsQuery({
        fullArchives,
        ownerId,
        sensitive,
        toread,
        starred,
        ready,
        archiveId,
        bookmarkId,
        before,
        after,
        })
      }
      order by ${after
        ? SQL`ar.created_at asc, ar.url asc, ar.title asc`
        : SQL`ar.created_at desc, ar.url desc, ar.title desc`
      }
      ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
    )
    select *
    from archive_page ap
    order by ap.created_at desc, ap.url desc, ap.title desc
  `

  return archivesQuery
}
