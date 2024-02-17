import fp from 'fastify-plugin'
import { Queue } from 'bullmq'

/**
 * This plugins adds bullMQ queues
 */
export default fp(async function (fastify, opts) {
  const defaultJobOptions = {
    removeOnComplete: {
      age: 3600, // keep up to 1 hour
      count: 1000 // keep up to 1000 jobs
    },
    removeOnFail: {
      age: 24 * 3600 // keep up to 24 hours
    }
  }
  const resolveEpisodeQ = new Queue('resolveEpisode', {
    connection: fastify.redis.bullmq,
    defaultJobOptions
  })

  const resolveDocumentQ = new Queue('resolveDocument', {
    connection: fastify.redis.bullmq,
    defaultJobOptions
  })

  const queues = {
    resolveEpisodeQ,
    resolveDocumentQ
  }

  fastify.decorate('queues', queues)
},
{
  dependencies: ['env', 'redis']
})
