import SQL from '@nearform/sql'
import { episodePropsQuery } from '../../episodes/episode-query-get.js'

/**
 * @typedef {import('@nearform/sql').SqlStatement} SqlStatement
 */

export function getSearchEpisodesQuery ({
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
  const searchEpisodeQuery = SQL`
    ${episodePropsQuery({
      includeFeed: true,
      ready: true,
      ownerId,
      sensitive,
      query,
      includeRank: true,
      })}
    and ep.tsv @@ plainto_tsquery('english', ${query})
    ${
      lastRank
        ? !reverse
          ? SQL`
            and (
              ts_rank(ep.tsv, plainto_tsquery('english', ${query})) < ${lastRank}
              ${lastId ? SQL`OR (ts_rank(ep.tsv, plainto_tsquery('english', ${query})) = ${lastRank} AND ep.id > ${lastId})` : SQL``}
            )
          `
          : SQL`
            and (
              ts_rank(ep.tsv, plainto_tsquery('english', ${query})) > ${lastRank}
              ${lastId ? SQL`OR (ts_rank(ep.tsv, plainto_tsquery('english', ${query})) = ${lastRank} AND ep.id < ${lastId})` : SQL``}
            )
          `
        : SQL``
    }
    order by
    ${!reverse ? SQL`rank desc, id asc, created_at desc` : SQL`rank asc, id desc, created_at asc`}
    ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
  `

  return searchEpisodeQuery
}
