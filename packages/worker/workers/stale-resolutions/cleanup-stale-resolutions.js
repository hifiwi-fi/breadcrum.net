/**
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { FastifyBaseLogger } from 'fastify'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {Object} CleanupStaleResolutionsResult
 * @property {number} bookmarkCount - Number of bookmarks marked done
 * @property {number} archiveCount - Number of archives marked done
 * @property {number} episodeCount - Number of episodes marked done
 */

const STALE_MESSAGE = 'Timed out: marked done by cleanup job'

/**
 * Mark stale done=false records as done with an error message.
 * - Bookmarks older than 24h
 * - Archives older than 24h
 * - Episodes older than 7 days (preserve legitimately upcoming/scheduled episodes)
 *
 * @param {Object} params
 * @param {PgClient} params.pg
 * @param {FastifyBaseLogger} params.logger
 * @returns {Promise<CleanupStaleResolutionsResult>}
 */
export async function cleanupStaleResolutions ({ pg, logger }) {
  logger.info('Running stale resolution cleanup')

  const bookmarkResult = await pg.query(SQL`
    UPDATE bookmarks
    SET done = true,
        error = ${STALE_MESSAGE}
    WHERE done = false
      AND created_at < NOW() - INTERVAL '24 hours'
  `)
  const bookmarkCount = bookmarkResult.rowCount || 0

  const archiveResult = await pg.query(SQL`
    UPDATE archives
    SET done = true,
        error = ${STALE_MESSAGE}
    WHERE done = false
      AND created_at < NOW() - INTERVAL '24 hours'
  `)
  const archiveCount = archiveResult.rowCount || 0

  const episodeResult = await pg.query(SQL`
    UPDATE episodes
    SET done = true,
        error = ${STALE_MESSAGE}
    WHERE done = false
      AND created_at < NOW() - INTERVAL '7 days'
  `)
  const episodeCount = episodeResult.rowCount || 0

  logger.info({ bookmarkCount, archiveCount, episodeCount }, 'Stale resolution cleanup completed')

  return { bookmarkCount, archiveCount, episodeCount }
}
