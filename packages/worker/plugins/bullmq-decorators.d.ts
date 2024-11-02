import type { FastifyRequest } from 'fastify';
import type { Worker } from 'bullmq'

declare module 'fastify' {
  interface FastifyInstance {
    workers: {
      createEpisodeWorker: Worker
      resolveDocumentWorker: Worker
    }
  }
}
