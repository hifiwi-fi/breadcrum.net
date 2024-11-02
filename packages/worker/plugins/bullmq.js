import fp from 'fastify-plugin'
import { Worker } from 'bullmq'

import { makeEpisodeWorker } from '../workers/episode-worker/index.js'
import { makeDocumentWorker } from '../workers/document-processor/index.js'

/**
 * This plugins adds bullMQ queues
 */
export default fp(async function (fastify, _opts) {
  const redis = fastify.redis['bullmq']

  if (!redis) throw new Error('Missing a redis connection object')

  const defautOpts = {
    connection: redis,
    autorun: false,
  }

  // Running both workers in a single process
  const createEpisodeWorker = new Worker(
    'resolveEpisode',
    makeEpisodeWorker({ fastify }),
    defautOpts
  )

  const resolveDocumentWorker = new Worker(
    'resolveDocument',
    makeDocumentWorker({ fastify }),
    defautOpts
  )

  const workers = {
    createEpisodeWorker,
    resolveDocumentWorker,
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
