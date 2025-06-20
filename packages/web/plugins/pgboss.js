/**
 * @import { ResolveEpisodePgBossQ } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 * @import { ResolveArchivePgBossQ } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 * @import { ResolveBookmarkPgBossQ } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
 */
import fp from 'fastify-plugin'
import PgBoss from 'pg-boss'

import { resolveEpisodeQName } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { resolveArchiveQName } from '@breadcrum/resources/archives/resolve-archive-queue.js'
import { resolveBookmarkQName } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'

/**
 * This plugin adds pg-boss queues
 */
export default fp(async function (fastify, _) {
  const pg = fastify.pg
  const boss = new PgBoss({
    db: { executeSql: pg.query },
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

  await boss.start()
  fastify.log.info('pg-boss started')

  // Create queues similar to BullMQ structure
  await boss.createQueue(resolveEpisodeQName)
  await boss.createQueue(resolveArchiveQName)
  await boss.createQueue(resolveBookmarkQName)

  // Create queue wrappers that match BullMQ interface
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
    queues: {
      resolveEpisodeQ,
      resolveArchiveQ,
      resolveBookmarkQ
    }
  }

  fastify.decorate('pgboss', pgboss)

  fastify.addHook('onClose', async () => {
    fastify.log.info('stopping pg-boss')
    await boss.stop()
  })
},
{
  dependencies: ['env', 'pg'],
  name: 'pgboss',
})
