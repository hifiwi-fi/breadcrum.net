import SQL from '@nearform/sql'
import { archivePropsQuery } from '../../archives/archive-query-get.js'

/**
 * @import { SqlStatement } from '@nearform/sql'
 */

/**
 * Builds a SQL query for searching archives with various filters
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query string
 * @param {string} params.ownerId - ID of the archive owner
 * @param {boolean} params.sensitive - Include sensitive archives
 * @param {boolean} params.toread - Filter for unread archives
 * @param {boolean} params.starred - Filter for starred archives
 * @param {number} params.perPage - Number of results per page
 * @param {string} [params.lastRank] - Rank for pagination
 * @param {string} [params.lastId] - Last archive ID for pagination
 * @param {boolean} [params.reverse=false] - Reverse the sort order
 * @returns {SqlStatement} SQL query for searching archives
 */
export function getSearchArchivesQuery ({
  query,
  ownerId,
  sensitive,
  toread,
  starred,
  perPage,
  lastRank,
  lastId,
  reverse = false
}) {
  const searchBookmarksQuery = SQL`
    ${archivePropsQuery({
      fullArchives: false,
      ownerId,
      sensitive,
      toread,
      starred,
      query,
      includeRank: true,
      })}
    and ar.tsv @@ plainto_tsquery('english', ${query})
    ${
      lastRank
        ? !reverse
          ? SQL`
            and (
              ts_rank(ar.tsv, plainto_tsquery('english', ${query})) < ${lastRank}
              ${lastId ? SQL`OR (ts_rank(ar.tsv, plainto_tsquery('english', ${query})) = ${lastRank} AND ar.id > ${lastId})` : SQL``}
            )
          `
          : SQL`
            and (
              ts_rank(ar.tsv, plainto_tsquery('english', ${query})) > ${lastRank}
              ${lastId ? SQL`OR (ts_rank(ar.tsv, plainto_tsquery('english', ${query})) = ${lastRank} AND ar.id < ${lastId})` : SQL``}
            )
          `
        : SQL``
    }
    order by
    ${!reverse ? SQL`rank desc, id asc, created_at desc` : SQL`rank asc, id desc, created_at asc`}
    ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
  `

  return searchBookmarksQuery
}
