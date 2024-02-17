import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'
import { FastifyAdapter } from '@bull-board/fastify'

export default async function adminFlagsRoutes (fastify, opts) {
  const serverAdapter = new FastifyAdapter()

  createBullBoard({
    queues: [
      new BullMQAdapter(fastify.queues.resolveEpisodeQ),
      new BullMQAdapter(fastify.queues.resolveDocumentQ)
    ],
    serverAdapter
  })

  serverAdapter.setBasePath('/admin/bull')
  fastify.register(serverAdapter.registerPlugin())
}
