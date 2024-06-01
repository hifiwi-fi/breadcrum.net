import type { FastifyRequest } from 'fastify';
import type { Queue } from 'bullmq'

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      resolveEpisodeQ: Queue
      resolveDocumentQ: Queue
    }
  }
}
