/**
 * @import { FastifyInstance } from 'fastify'
 * @import PgBoss from '@breadcrum/resources/pgboss/types.js'
 */
import { cleanupStaleAuthTokens } from './cleanup-stale-tokens.js'

/**
 * pg-boss compatible auth token cleanup processor
 * @param {object} params
 * @param {FastifyInstance} params.fastify
 * @return {PgBoss.WorkHandler<Record<string, never>>} pg-boss handler
 */
export function makeAuthTokenCleanupP ({ fastify }) {
  const logger = fastify.log

  /** @type {PgBoss.WorkHandler<Record<string, never>>} */
  return async function authTokenCleanupP (jobs) {
    for (const job of jobs) {
      const log = logger.child({
        jobId: job.id,
      })

      const pg = fastify.pg

      const jobStartTime = performance.now()

      log.info('Starting auth token cleanup job')

      try {
        const retentionDays = fastify.config['AUTH_TOKEN_RETENTION_DAYS'] || 365

        const result = await cleanupStaleAuthTokens({
          pg,
          logger: log,
          retentionDays: /** @type {number} */ (retentionDays)
        })

        const totalDuration = (performance.now() - jobStartTime) / 1000

        fastify.otel.authTokensCleanedCounter.add(result.deletedCount)
        fastify.otel.authTokensCleanupJobCounter.add(1)
        fastify.otel.authTokensCleanupDuration.record(totalDuration)

        log.info({ deletedCount: result.deletedCount, durationSeconds: totalDuration }, 'Auth token cleanup completed successfully')
      } catch (err) {
        /** @type {Error} */
        const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })

        const totalDuration = (performance.now() - jobStartTime) / 1000
        fastify.otel.authTokensCleanupDuration.record(totalDuration)

        log.error(handledError, 'Auth token cleanup job failed')
        throw handledError
      }
    }
  }
}
