/**
 * @import { ResolveEpisodeQ } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 * @import { ResolveArchiveQ } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 * @import { ResolveBookmarkQ } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
 */
import fp from 'fastify-plugin'
import { Queue } from 'bullmq'

import { resolveEpisodeQName } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { resolveArchiveQName } from '@breadcrum/resources/archives/resolve-archive-queue.js'
import { resolveBookmarkQName } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import { defaultJobOptions } from '@breadcrum/resources/bullmq/default-job-options.js'

/**
 * This plugins adds bullMQ queues
 */
export default fp(async function (fastify, _) {
  const queueRedis = fastify.redis['bullmq']
  if (queueRedis !== undefined) {
    /** @type {ResolveEpisodeQ} */
    const resolveEpisodeQ = new Queue(
      resolveEpisodeQName,
      {
        connection: queueRedis,
        defaultJobOptions,
      }
    )

    /** @type {ResolveArchiveQ} */
    const resolveArchiveQ = new Queue(
      resolveArchiveQName,
      {
        connection: queueRedis,
        defaultJobOptions,
      }
    )

    /** @type {ResolveBookmarkQ} */
    const resolveBookmarkQ = new Queue(
      resolveBookmarkQName,
      {
        connection: queueRedis,
        defaultJobOptions,
      }
    )

    const queues = {
      resolveEpisodeQ,
      resolveArchiveQ,
      resolveBookmarkQ
    }

    fastify.decorate('queues', queues)
  } else {
    fastify.log.warn('Redis connection not found')
  }
},
{
  dependencies: ['env', 'redis'],
  name: 'bullmq',
})
