import SQL from '@nearform/sql'
import { episodePropsQuery } from '../../episodes/episode-query-get.js'

/**
 * Constructs a SQL query for searching episodes based on various filters and pagination options.
 *
 * This function generates a dynamic SQL query using the `@nearform/sql` library to safely
 * construct a query with parameters. It incorporates filters such as ownership, sensitivity,
 * read status, and starred status. Additionally, it supports pagination through `lastRank`,
 * `lastId`, and `perPage` parameters, and allows results to be ordered in reverse.
 *
 * The core of the search functionality relies on PostgreSQL's full-text search capabilities,
 * specifically using the `plainto_tsquery` function to match episodes against the provided query.
 *
 * @param {Object} params - The parameters for the query.
 * @param {string} params.query - The search query string.
 * @param {string} params.ownerId - The ID of the owner of the episodes.
 * @param {boolean} params.sensitive - Flag to include sensitive episodes.
 * @param {boolean} params.toread - Flag to filter episodes marked as "to read".
 * @param {boolean} params.starred - Flag to filter episodes marked as starred.
 * @param {number} [params.perPage] - The maximum number of episodes to return. If not provided, all matching episodes are returned.
 * @param {number} [params.lastRank] - The rank of the last episode in the previous query result, used for pagination.
 * @param {number} [params.lastId] - The ID of the last episode in the previous query result, used for pagination.
 * @param {boolean} [params.reverse=false] - Whether to reverse the order of the results.
 * @returns {import('@nearform/sql').SqlStatement} The constructed SQL query statement ready to be executed.
 */
export function getSearchEpisodesQuery ({
  query,
  ownerId,
  sensitive,
  // toread,
  // starred,
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
