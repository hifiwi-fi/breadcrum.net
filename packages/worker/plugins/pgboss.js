/**
 * @import { ResolveEpisodePgBossW, ResolveEpisodePgBossQ } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 * @import { ResolveArchivePgBossW, ResolveArchivePgBossQ } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 * @import { ResolveBookmarkPgBossW, ResolveBookmarkPgBossQ } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
 */
import fp from 'fastify-plugin'
import PgBoss from 'pg-boss'

import { resolveEpisodeQName } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { resolveArchiveQName } from '@breadcrum/resources/archives/resolve-archive-queue.js'
import { resolveBookmarkQName } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import { defaultBossOptions, defaultQueueOptions } from '@breadcrum/resources/pgboss/default-job-options.js'

import { makeEpisodePgBossP } from '../workers/episodes/index.js'
import { makeArchivePgBossP } from '../workers/archives/index.js'
import { makeBookmarkPgBossP } from '../workers/bookmarks/index.js'

/**
 * This plugin adds pg-boss workers
 */
export default fp(async function (fastify, _opts) {
  const boss = new PgBoss({
    ...defaultBossOptions,
    db: { executeSql: fastify.pg.query },
  })

  // Set up event listeners for pg-boss
  boss.on('error', (error) => {
    fastify.log.error(error, 'pg-boss error')
  })

  boss.on('wip', (workers) => {
    fastify.log.debug(workers, 'pg-boss workers in progress')
  })

  boss.on('stopped', () => {
    fastify.log.info('pg-boss stopped')
  })

  fastify.log.info({ isInstalled: await boss.isInstalled() })

  fastify.log.info('pg-boss starting..,')
  await boss.start()
  fastify.log.info('pg-boss started')

  fastify.log.info({ isInstalled: await boss.isInstalled() })

  // Create queues with v11 configuration
  await boss.createQueue(resolveEpisodeQName, defaultQueueOptions)
  await boss.createQueue(resolveArchiveQName, defaultQueueOptions)
  await boss.createQueue(resolveBookmarkQName, defaultQueueOptions)

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
    episodeWorkers,
    archiveWorkers,
    bookmarkWorkers
  }

  // Create queue wrappers that match web package interface
  /** @type {ResolveEpisodePgBossQ} */
  const resolveEpisodeQ = {
    name: resolveEpisodeQName,
    send: (request) => boss.send({
      name: resolveEpisodeQName,
      data: request.data,
      options: { ...request.options }
    })
  }

  /** @type {ResolveArchivePgBossQ} */
  const resolveArchiveQ = {
    name: resolveArchiveQName,
    send: (request) => boss.send({
      name: resolveArchiveQName,
      data: request.data,
      options: { ...request.options }
    })
  }

  /** @type {ResolveBookmarkPgBossQ} */
  const resolveBookmarkQ = {
    name: resolveBookmarkQName,
    send: (request) => boss.send({
      name: resolveBookmarkQName,
      data: request.data,
      options: { ...request.options }
    })
  }

  const pgboss = {
    boss,
    workers,
    queues: {
      resolveEpisodeQ,
      resolveArchiveQ,
      resolveBookmarkQ
    }
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
