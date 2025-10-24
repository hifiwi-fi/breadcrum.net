/**
 * @import { ResolveEpisodePgBossW } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 * @import { ResolveArchivePgBossW } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 * @import { ResolveBookmarkPgBossW } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
 */
import fp from 'fastify-plugin'

import { resolveEpisodeQName, createResolveEpisodeQ } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { resolveArchiveQName, createResolveArchiveQ } from '@breadcrum/resources/archives/resolve-archive-queue.js'
import { resolveBookmarkQName, createResolveBookmarkQ } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import { startPGBoss } from '@breadcrum/resources/pgboss/start-pgboss.js'

import { makeEpisodePgBossP } from '../workers/episodes/index.js'
import { makeArchivePgBossP } from '../workers/archives/index.js'
import { makeBookmarkPgBossP } from '../workers/bookmarks/index.js'

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
    resolveBookmarkQ: await createResolveBookmarkQ({ boss })
  }
  fastify.log.info('pg-boss queues created')

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

  const workers = {
    [resolveEpisodeQName]: episodeWorkers,
    [resolveArchiveQName]: archiveWorkers,
    [resolveBookmarkQName]: bookmarkWorkers
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
  dependencies: ['env', 'pg', 'otel-metrics'],
  name: 'pgboss',
})
