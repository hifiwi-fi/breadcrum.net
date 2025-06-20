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

import { makeEpisodePgBossP } from '../workers/episodes/index.js'
import { makeArchivePgBossP } from '../workers/archives/index.js'
import { makeBookmarkPgBossP } from '../workers/bookmarks/index.js'

/**
 * This plugin adds pg-boss workers
 */
export default fp(async function (fastify, _opts) {
  const boss = new PgBoss({
    db: { executeSql: fastify.pg.query },
    // Match BullMQ cleanup policies
    archiveCompletedAfterSeconds: 3600,
    archiveFailedAfterSeconds: 24 * 3600,
    deleteAfterHours: 48
  })

  // Set up event listeners for pg-boss
  boss.on('error', (error) => {
    fastify.log.error(error, 'pg-boss error')
  })

  boss.on('monitor-states', (states) => {
    fastify.log.info(states, 'pg-boss queue states')
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

  // Create pg-boss workers with native processors
  /** @type {ResolveEpisodePgBossW} */
  const episodeWorker = await boss.work(
    resolveEpisodeQName,
    makeEpisodePgBossP({ fastify })
  )

  /** @type {ResolveArchivePgBossW} */
  const archiveWorker = await boss.work(
    resolveArchiveQName,
    makeArchivePgBossP({ fastify })
  )

  /** @type {ResolveBookmarkPgBossW} */
  const bookmarkWorker = await boss.work(
    resolveBookmarkQName,
    makeBookmarkPgBossP({ fastify })
  )

  const workers = {
    episodeWorker,
    archiveWorker,
    bookmarkWorker
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

  fastify.addHook('onClose', async (_instance) => {
    fastify.log.info('stopping pg-boss workers')
    await boss.stop()
  })
},
{
  dependencies: ['env', 'pg'],
  name: 'pgboss',
})
