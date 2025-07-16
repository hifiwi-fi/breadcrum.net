/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeAuthTokenRead } from './schemas/schema-auth-token-read.js'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 * @import { SqlStatement } from '@nearform/sql'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {object} GetAuthTokensQueryParams
 * @property {string} userId - The unique identifier of the user to fetch tokens for.
 * @property {string | undefined} [beforeCursor] - Composite cursor for before pagination (format: "micros:jti"). Optional.
 * @property {string | undefined} [afterCursor] - Composite cursor for after pagination (format: "micros:jti"). Optional.
 * @property {number} perPage - The number of tokens to fetch per page. Optional.
 * @property {string} sortOrder='desc' - Sort order for last_seen ('asc' or 'desc'). Optional.
 * @property {string} [currentJti] - The current JWT ID to compare for is_current flag. Optional.
 */

/**
 * @typedef {GetAuthTokensQueryParams & {
 *   fastify: FastifyInstance,
 *   pg?: PgClient,
 *   currentJti?: string
 * }} GetAuthTokensParams
 */

/**
 * Retrieves auth tokens based on the provided query parameters.
 *
 * @function getAuthTokens
 * @param {GetAuthTokensParams} getAuthTokensParams - Parameters to shape the query.
 * @returns {Promise<TypeAuthTokenRead[]>} An array of auth token objects.
 */
export async function getAuthTokens (getAuthTokensParams) {
  const { fastify, pg, ...getAuthTokensQueryParams } = getAuthTokensParams
  const client = pg ?? fastify.pg
  const query = getAuthTokensQuery(getAuthTokensQueryParams)

  /** @type {QueryResult<TypeAuthTokenRead>} */
  const results = await client.query(query)
  return results.rows
}

/**
 * Constructs a SQL query to fetch auth tokens for a specific user.
 *
 * @function getAuthTokensQuery
 * @param {GetAuthTokensQueryParams} params - Parameters to shape the query.
 * @returns {SqlStatement} SQL template literal representing the auth tokens query.
 *
 * @example
 * // Fetch first 10 tokens sorted by most recently used
 * getAuthTokensQuery({ userId: '123', perPage: 10 });
 *
 * // Fetch tokens before a specific cursor
 * getAuthTokensQuery({ userId: '123', beforeCursor: '1704110400123456:550e8400-e29b-41d4-a716-446655440000', perPage: 10 });
 *
 * // Fetch tokens in ascending order (oldest first)
 * getAuthTokensQuery({ userId: '123', sortOrder: 'asc', perPage: 10 });
 */
export const getAuthTokensQuery = ({
  userId,
  beforeCursor,
  afterCursor,
  perPage,
  sortOrder = 'desc',
  currentJti,
}) => {
  const sortAsc = sortOrder === 'asc'

  // Parse composite cursors if provided
  let beforeMicros, beforeJti, afterMicros, afterJti
  if (beforeCursor) {
    const parts = beforeCursor.split(':')
    if (parts.length === 2) {
      beforeMicros = parts[0]
      beforeJti = parts[1]
    }
  }
  if (afterCursor) {
    const parts = afterCursor.split(':')
    if (parts.length === 2) {
      afterMicros = parts[0]
      afterJti = parts[1]
    }
  }

  const tokensQuery = SQL`
    WITH tokens_page AS (
      SELECT
        jti,
        created_at,
        last_seen,
        (EXTRACT(EPOCH FROM last_seen) * 1000000)::bigint::text AS last_seen_micros,
        updated_at,
        user_agent,
        ip,
        note,
        ${currentJti ? SQL`(jti = ${currentJti}) as is_current` : SQL`false as is_current`}
      FROM auth_tokens
      WHERE owner_id = ${userId}
      ${beforeMicros && beforeJti ? SQL`AND (last_seen, jti) < (to_timestamp(${beforeMicros}::numeric / 1000000), ${beforeJti}::uuid)` : SQL``}
      ${afterMicros && afterJti ? SQL`AND (last_seen, jti) > (to_timestamp(${afterMicros}::numeric / 1000000), ${afterJti}::uuid)` : SQL``}
      ORDER BY ${
        afterCursor
          ? SQL`last_seen ASC, jti ASC`
          : SQL`last_seen DESC, jti DESC`
      }
      ${perPage != null ? SQL`FETCH FIRST ${perPage} ROWS ONLY` : SQL``}
    )
    SELECT
      jti,
      created_at,
      last_seen,
      last_seen_micros,
      updated_at,
      user_agent,
      ip,
      note,
      is_current
    FROM tokens_page
    ORDER BY last_seen ${sortAsc ? SQL`ASC` : SQL`DESC`}, jti ${sortAsc ? SQL`ASC` : SQL`DESC`}
  `

  return tokensQuery
}
