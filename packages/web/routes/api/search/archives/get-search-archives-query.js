import SQL from '@nearform/sql'
import { archivePropsQuery } from '../../archives/archive-query-get.js'

/**
 * @typedef {import('@nearform/sql').SqlStatement} SqlStatement
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
  reverse = false, // Add reverse argument, default to false
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
