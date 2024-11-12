/**
 * @import { ResolveEpisodeW, ResolveEpisodeQ } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 * @import { ResolveArchiveW } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 * @import { ResolveBookmarkW } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
 */
import fp from 'fastify-plugin'
import { Worker, Queue } from 'bullmq'

import { resolveEpisodeQName } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { resolveArchiveQName } from '@breadcrum/resources/archives/resolve-archive-queue.js'
import { resolveBookmarkQName } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import { defaultJobOptions } from '@breadcrum/resources/bullmq/default-job-options.js'

import { makeEpisodeP } from '../workers/episodes/index.js'
import { makeArchiveP } from '../workers/archives/index.js'
import { makeBookmarkP } from '../workers/bookmarks/index.js'

/**
 * This plugins adds bullMQ queues
 */
export default fp(async function (fastify, _opts) {
  const redis = fastify.redis['bullmq']

  if (!redis) throw new Error('Missing a redis connection object')

  /** @type {ResolveEpisodeQ} */
  const resolveEpisodeQ = new Queue(
    resolveEpisodeQName,
    {
      connection: redis,
      defaultJobOptions,
    }
  )

  const queues = {
    resolveEpisodeQ,
  }

  fastify.decorate('queues', queues)

  const defaultWorkerOpts = {
    connection: redis,
    autorun: false,
  }

  // Running both workers in a single process
  /** @type {ResolveEpisodeW} */
  const resolveEpisodeW = new Worker(
    resolveEpisodeQName,
    makeEpisodeP({ fastify }),
    defaultWorkerOpts
  )

  /** @type {ResolveArchiveW} */
  const resolveArchiveW = new Worker(
    resolveArchiveQName,
    makeArchiveP({ fastify }),
    defaultWorkerOpts
  )

  /** @type {ResolveBookmarkW} */
  const resolveBookmarkW = new Worker(
    resolveBookmarkQName,
    makeBookmarkP({ fastify }),
    defaultWorkerOpts
  )

  const workers = {
    resolveEpisodeW,
    resolveArchiveW,
    resolveBookmarkW
  }

  fastify.decorate('workers', workers)

  Object.values(workers).forEach(worker => {
    worker.on('error', err => {
      fastify.log.error(err, 'Worker encountered an error')
    })

    worker.on('failed', (job, error) => {
      fastify.log.warn({
        job,
        error,
      }, 'Job failed')
    })
  })

  fastify.addHook('onReady', async () => {
    Object.values(workers).forEach(worker => {
      fastify.log.info(`Starting ${worker.name} worker`)
      worker.run()
    })

    // Don't have a great way to wait for this not to hang tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  fastify.addHook('onClose', async (_instance) => {
    await Promise.all(
      Object.values(workers)
        .map(worker => worker.close()
        )
    )
  })
},
{
  dependencies: ['env', 'redis'],
})
