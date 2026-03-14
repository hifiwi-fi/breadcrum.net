/**
 * @import { FastifyInstance } from 'fastify'
 * @import { WorkHandler } from '@breadcrum/resources/pgboss/types.js'
 */

import { cleanupStaleResolutions } from './cleanup-stale-resolutions.js'

/**
 * pg-boss compatible stale resolution cleanup processor
 * @param {object} params
 * @param {FastifyInstance} params.fastify
 * @return {WorkHandler<Record<string, never>>} pg-boss handler
 */
export function makeStaleResolutionCleanupP ({ fastify }) {
  const logger = fastify.log

  /** @type {WorkHandler<Record<string, never>>} */
  return async function staleResolutionCleanupP (jobs) {
    for (const job of jobs) {
      const log = logger.child({ jobId: job.id })
      const pg = fastify.pg
      const jobStartTime = performance.now()

      log.info('Starting stale resolution cleanup job')

      try {
        const result = await cleanupStaleResolutions({ pg, logger: log })

        const totalDuration = (performance.now() - jobStartTime) / 1000

        fastify.otel.staleBookmarksCleanedCounter.add(result.bookmarkCount)
        fastify.otel.staleArchivesCleanedCounter.add(result.archiveCount)
        fastify.otel.staleEpisodesCleanedCounter.add(result.episodeCount)
        fastify.otel.staleResolutionsCleanupJobCounter.add(1)
        fastify.otel.staleResolutionsCleanupDuration.record(totalDuration)

        log.info({ ...result, durationSeconds: totalDuration }, 'Stale resolution cleanup completed successfully')
      } catch (err) {
        /** @type {Error} */
        const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })

        const totalDuration = (performance.now() - jobStartTime) / 1000
        fastify.otel.staleResolutionsCleanupDuration.record(totalDuration)

        log.error(handledError, 'Stale resolution cleanup job failed')
        throw handledError
      }
    }
  }
}
