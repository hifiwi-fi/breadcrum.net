import fp from 'fastify-plugin'
import { Queue } from 'bullmq'

/**
 * This plugins adds bullMQ queues
 */
export default fp(async function (fastify, _) {
  const defaultJobOptions = {
    removeOnComplete: {
      age: 3600, // keep up to 1 hour
      count: 1000 // keep up to 1000 jobs
    },
    removeOnFail: {
      age: 24 * 3600 // keep up to 24 hours
    }
  }

  // eslint-disable-next-line dot-notation
  const queueRedis = fastify.redis['bullmq']
  if (queueRedis !== undefined) {
    const resolveEpisodeQ = new Queue('resolveEpisode', {
      connection: queueRedis,
      defaultJobOptions
    })

    const resolveDocumentQ = new Queue('resolveDocument', {
      connection: queueRedis,
      defaultJobOptions
    })

    const queues = {
      resolveEpisodeQ,
      resolveDocumentQ
    }

    fastify.decorate('queues', queues)
  } else {
    fastify.log.warn('Redis connection not found')
  }
},
{
  dependencies: ['env', 'redis']
})
