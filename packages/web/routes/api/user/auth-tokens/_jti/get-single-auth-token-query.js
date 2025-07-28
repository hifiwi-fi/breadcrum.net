/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 * @import { SqlStatement } from '@nearform/sql'
 * @import { AuthTokenQueryRead, AuthTokenQueryReadDbResult } from '../get-auth-tokens-query.js'
 */

import SQL from '@nearform/sql'
import { parseUserAgent } from '../get-auth-tokens-query.js'

/**
 * @typedef {GetSingleAuthTokenQueryParams & {
 *   fastify: FastifyInstance,
 *   pg?: PgClient,
 *   currentJti?: string
 * }} GetSingleAuthTokenParams
 */

/**
 * Retrieves a single auth token for a user.
 *
 * @function getSingleAuthToken
 * @param {GetSingleAuthTokenParams} getSingleAuthTokenParams - Parameters to shape the query.
 * @returns {Promise<AuthTokenQueryRead | undefined>} An auth token object or undefined if not found.
 */
export async function getSingleAuthToken (getSingleAuthTokenParams) {
  const { fastify, pg, ...getSingleAuthTokenQueryParams } = getSingleAuthTokenParams
  const client = pg ?? fastify.pg
  const query = getSingleAuthTokenQuery(getSingleAuthTokenQueryParams)

  /** @type {QueryResult<AuthTokenQueryReadDbResult>} */
  const results = await client.query(query)

  const rawResult = results.rows[0]
  if (!rawResult) {
    return undefined
  }

  const parsedResult = parseUserAgent(rawResult)

  return parsedResult
}

/**
 * @typedef {object} GetSingleAuthTokenQueryParams
 * @property {string} userId - The unique identifier of the user.
 * @property {string} jti - The JWT ID of the token to retrieve.
 * @property {string} [currentJti] - The current JWT ID to compare for is_current flag. Optional.
 */

/**
 * Constructs a SQL query to fetch a single auth token.
 *
 * @function getSingleAuthTokenQuery
 * @param {GetSingleAuthTokenQueryParams} params - Parameters to shape the query.
 * @returns {SqlStatement} SQL template literal representing the query.
 */
export const getSingleAuthTokenQuery = ({
  userId,
  jti,
  currentJti,
}) => {
  const query = SQL`
    SELECT
      jti,
      created_at,
      last_seen,
      (EXTRACT(EPOCH FROM last_seen) * 1000000)::bigint::text AS last_seen_micros,
      updated_at,
      user_agent,
      ip,
      note,
      source,
      protect,
      ${currentJti ? SQL`(jti = ${currentJti}) as is_current` : SQL`false as is_current`}
    FROM auth_tokens
    WHERE jti = ${jti}
      AND owner_id = ${userId}
    FETCH FIRST 1 ROW ONLY
  `

  return query
}
