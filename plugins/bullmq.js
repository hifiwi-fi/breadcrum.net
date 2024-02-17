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
  const createEpisodeQ = new Queue('createEpisode', {
    connection: fastify.redis,
    defaultJobOptions
  })

  const createArchiveQ = new Queue('createArchive', {
    connection: fastify.redis,
    defaultJobOptions
  })

  const populateBookmarkQ = new Queue('populateBookmark', {
    connection: fastify.redis,
    defaultJobOptions
  })

  const queues = {
    createEpisodeQ,
    createArchiveQ,
    populateBookmarkQ
  }

  fastify.decorate('queues', queues)
},
{
  dependencies: ['env', 'redis']
})
