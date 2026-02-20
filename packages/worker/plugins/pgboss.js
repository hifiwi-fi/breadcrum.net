/**
 * @import { ResolveEpisodePgBossW } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 * @import { ResolveArchivePgBossW } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 * @import { ResolveBookmarkPgBossW } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
 * @import { CleanupAuthTokensPgBossW } from '@breadcrum/resources/auth-tokens/cleanup-auth-tokens-queue.js'
 * @import { SyncSubscriptionPgBossW } from '@breadcrum/resources/billing/sync-subscription-queue.js'
 * @import { JSONSchema } from 'json-schema-to-ts'
 */
import fp from 'fastify-plugin'

import { resolveEpisodeQName, createResolveEpisodeQ } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { resolveArchiveQName, createResolveArchiveQ } from '@breadcrum/resources/archives/resolve-archive-queue.js'
import { resolveBookmarkQName, createResolveBookmarkQ } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import { cleanupAuthTokensQName, createCleanupAuthTokensQ } from '@breadcrum/resources/auth-tokens/cleanup-auth-tokens-queue.js'
import { syncSubscriptionQName, createSyncSubscriptionQ } from '@breadcrum/resources/billing/sync-subscription-queue.js'
import { startPGBoss } from '@breadcrum/resources/pgboss/start-pgboss.js'

import { makeEpisodePgBossP } from '../workers/episodes/index.js'
import { makeArchivePgBossP } from '../workers/archives/index.js'
import { makeBookmarkPgBossP } from '../workers/bookmarks/index.js'
import { makeAuthTokenCleanupP } from '../workers/auth-tokens/index.js'
import { makeSyncSubscriptionP } from '../workers/billing/sync-subscription.js'

export const pgbossEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    EPISODE_WORKER_CONCURRENCY: { type: 'integer', default: 2 },
    ARCHIVE_WORKER_CONCURRENCY: { type: 'integer', default: 2 },
    BOOKMARK_WORKER_CONCURRENCY: { type: 'integer', default: 2 },
  },
  required: [],
})

/**
 * This plugin adds pg-boss workers
 */
export default fp(async function (fastify, _opts) {
  // Start pg-boss with lifecycle management
  const boss = await startPGBoss({
    executeSql: fastify.pg.query,
    logger: fastify.log
  })

  // Create queue wrappers using factory functions
  // This automatically applies default configuration for each queue
  // NOTE: Queues must be created before workers are registered
  fastify.log.info('Creating pg-boss queues...')
  const queues = {
    resolveEpisodeQ: await createResolveEpisodeQ({ boss }),
    resolveArchiveQ: await createResolveArchiveQ({ boss }),
    resolveBookmarkQ: await createResolveBookmarkQ({ boss }),
    cleanupAuthTokensQ: await createCleanupAuthTokensQ({ boss }),
    syncSubscriptionQ: await createSyncSubscriptionQ({ boss })
  }
  fastify.log.info('pg-boss queues created')

  // Schedule auth token cleanup job (runs at 3 AM UTC daily)
  await boss.schedule(cleanupAuthTokensQName, '0 3 * * *', undefined, { tz: 'UTC' })
  fastify.log.info({ jobName: cleanupAuthTokensQName, schedule: '0 3 * * *' }, 'Scheduled auth token cleanup job')

  // Create pg-boss workers with native processors
  /** @type {ResolveEpisodePgBossW[]} */
  const episodeWorkers = []
  const episodeWorkerFn = makeEpisodePgBossP({ fastify })
  for (let i = 0; i < fastify.config.EPISODE_WORKER_CONCURRENCY; i++) {
    episodeWorkers.push(
      await boss.work(resolveEpisodeQName, episodeWorkerFn)
    )
  }

  /** @type {ResolveArchivePgBossW[]} */
  const archiveWorkers = []
  const archiveWorkerFn = makeArchivePgBossP({ fastify })
  for (let i = 0; i < fastify.config.ARCHIVE_WORKER_CONCURRENCY; i++) {
    archiveWorkers.push(
      await boss.work(resolveArchiveQName, archiveWorkerFn)
    )
  }

  /** @type {ResolveBookmarkPgBossW[]} */
  const bookmarkWorkers = []
  const bookmarkWorkerFn = makeBookmarkPgBossP({ fastify })
  for (let i = 0; i < fastify.config.BOOKMARK_WORKER_CONCURRENCY; i++) {
    bookmarkWorkers.push(
      await boss.work(resolveBookmarkQName, bookmarkWorkerFn)
    )
  }

  // Create auth token cleanup worker (scheduled job)
  /** @type {CleanupAuthTokensPgBossW} */
  const cleanupAuthTokensWorker = await boss.work(cleanupAuthTokensQName, makeAuthTokenCleanupP({ fastify }))

  // Create subscription sync worker (webhook-triggered)
  /** @type {SyncSubscriptionPgBossW} */
  const syncSubscriptionWorker = await boss.work(syncSubscriptionQName, makeSyncSubscriptionP({ fastify }))

  const workers = {
    [resolveEpisodeQName]: episodeWorkers,
    [resolveArchiveQName]: archiveWorkers,
    [resolveBookmarkQName]: bookmarkWorkers,
    [cleanupAuthTokensQName]: [cleanupAuthTokensWorker],
    [syncSubscriptionQName]: [syncSubscriptionWorker]
  }

  const pgboss = {
    boss,
    workers,
    queues
  }

  fastify.decorate('pgboss', pgboss)

  // Register batch observable callback for pg-boss queue metrics
  // This calls boss.getQueues() once and reports to all 4 gauges
  fastify.otel.meter.addBatchObservableCallback(
    async (observableResult) => {
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
    },
    [
      fastify.otel.queueDeferredGauge,
      fastify.otel.queueQueuedGauge,
      fastify.otel.queueActiveGauge,
      fastify.otel.queueTotalGauge
    ]
  )

  fastify.addHook('onClose', async (_instance) => {
    fastify.log.info('stopping pg-boss workers')
    await boss.stop()
  })
},
{
  dependencies: ['env', 'pg', 'otel-metrics', 'billing'],
  name: 'pgboss',
})
