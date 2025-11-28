import fp from 'fastify-plugin'

import { createResolveEpisodeQ } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { createResolveArchiveQ } from '@breadcrum/resources/archives/resolve-archive-queue.js'
import { createResolveBookmarkQ } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import { startPGBoss } from '@breadcrum/resources/pgboss/start-pgboss.js'
import { defaultBossOptions } from '@breadcrum/resources/pgboss/default-job-options.js'

/**
 * This plugin adds pg-boss queues
 */
export default fp(async function (fastify, _) {
  // Start pg-boss with lifecycle management
  const boss = await startPGBoss({
    executeSql: fastify.pg.query,
    logger: fastify.log
  })

  // Create queue wrappers using factory functions
  // This automatically applies default configuration for each queue
  fastify.log.info('Creating pg-boss queues...')
  const queues = {
    resolveEpisodeQ: await createResolveEpisodeQ({ boss }),
    resolveArchiveQ: await createResolveArchiveQ({ boss }),
    resolveBookmarkQ: await createResolveBookmarkQ({ boss })
  }
  fastify.log.info('pg-boss queues created')

  const pgboss = {
    boss,
    config: defaultBossOptions,
    queues
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
