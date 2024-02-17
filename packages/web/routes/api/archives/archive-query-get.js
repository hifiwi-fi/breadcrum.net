import SQL from '@nearform/sql'

/**
 * @typedef {import('@nearform/sql').SqlStatement} SqlStatement
 */

/**
 * Generates an SQL query for fetching archive properties based on various filters.
 *
 * @export
 * @param {Object} options - The options object containing filter and query properties.
 * @param {boolean} [options.fullArchives] - Whether to include full HTML content of the archive.
 * @param {string|number} options.ownerId - The owner ID to filter the archives and bookmarks.
 * @param {boolean} [options.sensitive] - Whether to include sensitive bookmarks.
 * @param {boolean} [options.toread] - Whether to include bookmarks marked "to read."
 * @param {boolean} [options.starred] - Whether to include starred bookmarks.
 * @param {boolean} [options.ready] - Whether the archive is ready.
 * @param {string|number} [options.archiveId] - Specific archive ID to fetch.
 * @param {string|number} [options.bookmarkId] - Specific bookmark ID associated with an archive to fetch.
 * @param {string|number} [options.before] - Timestamp to fetch archives created before this time.
 * @param {string|number} [options.after] - Timestamp to fetch archives created after this time.
 * @param {boolean} [options.withRank] - Whether to include ranking based on text search.
 * @param {string} [options.query] - Text search query for ranking.
 * @param {boolean} [options.includeRank] - Include rank column
 *
 * @returns {SqlStatement} The generated SQL query.
 */
export function archivePropsQuery ({
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
  query,
  includeRank
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
 * @param {Object} options - The options object containing filter and query properties.
 * @param {boolean} [options.fullArchives] - Whether to include full HTML content of the archive.
 * @param {string|number} options.ownerId - The owner ID to filter the archives and bookmarks.
 * @param {boolean} [options.sensitive] - Whether to include sensitive bookmarks.
 * @param {boolean} [options.toread] - Whether to include bookmarks marked "to read."
 * @param {boolean} [options.starred] - Whether to include starred bookmarks.
 * @param {boolean} [options.ready] - Whether the archive is ready.
 * @param {string|number} [options.archiveId] - Specific archive ID to fetch.
 * @param {string|number} [options.bookmarkId] - Specific bookmark ID associated with an archive to fetch.
 * @param {string|number} [options.before] - Timestamp to fetch archives created before this time.
 * @param {string|number} [options.after] - Timestamp to fetch archives created after this time.
 * @param {string|number} [options.perPage] - Number of items per apge
 * @param {boolean} [options.withRank] - Whether to include ranking based on text search.
 * @param {string} [options.query] - Text search query for ranking.
 * @param {boolean} [options.includeRank] - Include rank column
 *
 * @returns {SqlStatement} The generated SQL query.
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
  fullArchives
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
        after
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
