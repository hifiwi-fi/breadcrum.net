/**
 * @import { ResolveEpisodePgBossW } from '#resources/episodes/resolve-episode-queue.js'
 * @import { ResolveArchivePgBossW } from '#resources/archives/resolve-archive-queue.js'
 * @import { ResolveBookmarkPgBossW } from '#resources/bookmarks/resolve-bookmark-queue.js'
 * @import { CleanupAuthTokensPgBossW } from '#resources/auth-tokens/cleanup-auth-tokens-queue.js'
 * @import { CleanupStaleResolutionsPgBossW } from '#resources/stale-resolutions/cleanup-stale-resolutions-queue.js'
 * @import { WorkHandler } from '#resources/pgboss/types.js'
 */
import fp from 'fastify-plugin'
import * as Sentry from '@sentry/node'

import { resolveEpisodeQName } from '#resources/episodes/resolve-episode-queue.js'
import { resolveArchiveQName } from '#resources/archives/resolve-archive-queue.js'
import { resolveBookmarkQName } from '#resources/bookmarks/resolve-bookmark-queue.js'
import { cleanupAuthTokensQName } from '#resources/auth-tokens/cleanup-auth-tokens-queue.js'
import { cleanupStaleResolutionsQName } from '#resources/stale-resolutions/cleanup-stale-resolutions-queue.js'
import { getSentryUserFromPgBossJobData } from '#resources/fastify-common/sentry-user-context.js'

import { makeEpisodePgBossP } from '../workers/episodes/index.js'
import { makeArchivePgBossP } from '../workers/archives/index.js'
import { makeBookmarkPgBossP } from '../workers/bookmarks/index.js'
import { makeAuthTokenCleanupP } from '../workers/auth-tokens/index.js'
import { makeStaleResolutionCleanupP } from '../workers/stale-resolutions/index.js'

export { pgbossEnvSchema } from '#config/env-schema.js'

export default fp(async function workerPlugin (fastify) {
  const { boss, workers, track } = fastify.pgboss
  fastify.addHook('onReady', async function activateWorkers () {
  // Schedule auth token cleanup job (runs at 3 AM UTC daily)
    await boss.schedule(cleanupAuthTokensQName, '0 3 * * *', undefined, { tz: 'UTC' })
    fastify.log.info({ jobName: cleanupAuthTokensQName, schedule: '0 3 * * *' }, 'Scheduled auth token cleanup job')

    // Schedule stale resolution cleanup job (runs at 4 AM UTC daily)
    await boss.schedule(cleanupStaleResolutionsQName, '0 4 * * *', undefined, { tz: 'UTC' })
    fastify.log.info({ jobName: cleanupStaleResolutionsQName, schedule: '0 4 * * *' }, 'Scheduled stale resolution cleanup job')

    const maybeWrapWorker = fastify.config.SENTRY_DSN ? wrapWorkerWithSentryJobScope : passthroughWorker

    // Create pg-boss workers with native processors
    /** @type {ResolveEpisodePgBossW[]} */
    const episodeWorkers = workers[resolveEpisodeQName] = []
    const episodeWorkerFn = track(maybeWrapWorker(resolveEpisodeQName, makeEpisodePgBossP({ fastify })))
    for (let i = 0; i < fastify.config.EPISODE_WORKER_CONCURRENCY; i++) {
      episodeWorkers.push(
        await boss.work(resolveEpisodeQName, episodeWorkerFn)
      )
    }

    /** @type {ResolveArchivePgBossW[]} */
    const archiveWorkers = workers[resolveArchiveQName] = []
    const archiveWorkerFn = track(maybeWrapWorker(resolveArchiveQName, makeArchivePgBossP({ fastify })))
    for (let i = 0; i < fastify.config.ARCHIVE_WORKER_CONCURRENCY; i++) {
      archiveWorkers.push(
        await boss.work(resolveArchiveQName, archiveWorkerFn)
      )
    }

    /** @type {ResolveBookmarkPgBossW[]} */
    const bookmarkWorkers = workers[resolveBookmarkQName] = []
    const bookmarkWorkerFn = track(maybeWrapWorker(resolveBookmarkQName, makeBookmarkPgBossP({ fastify })))
    for (let i = 0; i < fastify.config.BOOKMARK_WORKER_CONCURRENCY; i++) {
      bookmarkWorkers.push(
        await boss.work(resolveBookmarkQName, bookmarkWorkerFn)
      )
    }

    workers[cleanupAuthTokensQName] = []
    workers[cleanupStaleResolutionsQName] = []

    // Create auth token cleanup worker (scheduled job)
    /** @type {CleanupAuthTokensPgBossW} */
    const cleanupAuthTokensWorker = await boss.work(cleanupAuthTokensQName, track(maybeWrapWorker(cleanupAuthTokensQName, makeAuthTokenCleanupP({ fastify }))))

    // Create stale resolution cleanup worker (scheduled job)
    /** @type {CleanupStaleResolutionsPgBossW} */
    const cleanupStaleResolutionsWorker = await boss.work(cleanupStaleResolutionsQName, track(maybeWrapWorker(cleanupStaleResolutionsQName, makeStaleResolutionCleanupP({ fastify }))))

    workers[cleanupAuthTokensQName].push(cleanupAuthTokensWorker)
    workers[cleanupStaleResolutionsQName].push(cleanupStaleResolutionsWorker)
  })

  // Register batch observable callback for pg-boss queue metrics
  // This calls boss.getQueues() once and reports to all 4 gauges
  /** @type {Parameters<typeof fastify.otel.meter.addBatchObservableCallback>[0]} */
  const observeQueues = async (observableResult) => {
    try {
      const queues = await boss.getQueues()
      for (const queue of queues) {
        const attributes = { queue: queue.name }
        observableResult.observe(fastify.otel.queueDeferredGauge, queue.deferredCount, attributes)
        observableResult.observe(fastify.otel.queueQueuedGauge, queue.queuedCount, attributes)
        observableResult.observe(fastify.otel.queueActiveGauge, queue.activeCount, attributes)
        observableResult.observe(fastify.otel.queueTotalGauge, queue.totalCount, attributes)
      }
    } catch (err) {
      fastify.log.error(err, 'Failed to collect pg-boss queue metrics')
    }
  }
  const gauges = [
    fastify.otel.queueDeferredGauge,
    fastify.otel.queueQueuedGauge,
    fastify.otel.queueActiveGauge,
    fastify.otel.queueTotalGauge
  ]
  fastify.otel.meter.addBatchObservableCallback(observeQueues, gauges)
  fastify.addHook('onClose', async () => {
    fastify.otel.meter.removeBatchObservableCallback(observeQueues, gauges)
  })
},
{
  dependencies: ['env', 'pg', 'cache', 'otel-metrics', 'pgboss'],
  name: 'workers',
})

/**
 * @template T
 * @param {string} _queueName
 * @param {WorkHandler<T>} worker
 * @returns {WorkHandler<T>}
 */
function passthroughWorker (_queueName, worker) {
  return worker
}

/**
 * @template T
 * @param {string} queueName
 * @param {WorkHandler<T>} worker
 * @returns {WorkHandler<T>}
 */
function wrapWorkerWithSentryJobScope (queueName, worker) {
  return async function sentryJobScopeP (jobs) {
    for (const job of jobs) {
      await Sentry.withIsolationScope(async scope => {
        const user = getSentryUserFromPgBossJobData(job.data)
        scope.setUser(user ?? null)

        scope.setTag('pgboss.queue', queueName)
        scope.setContext('pgboss.job', {
          id: job.id,
          name: job.name,
        })

        try {
          await worker([job])
        } catch (err) {
          Sentry.captureException(err, { mechanism: { handled: false, type: 'auto.function.pgboss' } })
          throw err
        }
      })
    }
  }
}
