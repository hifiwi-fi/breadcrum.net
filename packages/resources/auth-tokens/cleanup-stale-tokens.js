/**
 * @import { PgClient } from '../types/pg-client.js'
 * @import { FastifyBaseLogger } from 'fastify'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {Object} CleanupResult
 * @property {number} deletedCount - Number of tokens deleted
 */

/**
 * Clean up stale auth tokens that haven't been used in more than 1 year.
 * Does NOT delete protected tokens (protect = true).
 *
 * @param {Object} params
 * @param {PgClient} params.pg - PostgreSQL client
 * @param {FastifyBaseLogger} params.logger - Logger instance
 * @param {number} [params.retentionDays=365] - Number of days to retain tokens
 * @returns {Promise<CleanupResult>}
 */
export async function cleanupStaleAuthTokens ({ pg, logger, retentionDays = 365 }) {
  // Validate retentionDays is a safe positive integer to prevent SQL injection
  if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
    throw new TypeError('retentionDays must be a positive integer')
  }

  // Use union type constraint for SQL.unsafe input
  /** @type {'1'|'7'|'30'|'90'|'180'|'365'|'730'} */
  const allowedDays = retentionDays === 1
    ? '1'
    : retentionDays === 7
      ? '7'
      : retentionDays === 30
        ? '30'
        : retentionDays === 90
          ? '90'
          : retentionDays === 180
            ? '180'
            : retentionDays === 365
              ? '365'
              : retentionDays === 730
                ? '730'
                : '365' // default fallback

  const query = SQL`
    DELETE FROM auth_tokens
    WHERE last_seen < NOW() - INTERVAL '${SQL.unsafe(allowedDays)} days'
      AND protect = false
    RETURNING jti
  `

  logger.info({ retentionDays }, 'Running auth token cleanup')

  const result = await pg.query(query)
  const deletedCount = result.rowCount || 0

  logger.info({ deletedCount }, 'Auth token cleanup completed')

  return { deletedCount }
}
