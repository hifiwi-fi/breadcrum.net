import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'
import { FastifyAdapter } from '@bull-board/fastify'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function adminFlagsRoutes (fastify, _opts) {
  const serverAdapter = new FastifyAdapter()

  createBullBoard({
    queues: [
      new BullMQAdapter(fastify.queues.resolveEpisodeQ),
      new BullMQAdapter(fastify.queues.resolveArchiveQ),
      new BullMQAdapter(fastify.queues.resolveBookmarkQ),
    ],
    serverAdapter,
  })

  serverAdapter.setBasePath('/admin/bull')
  // @ts-expect-error Types seem to be benignly wrong
  fastify.register(serverAdapter.registerPlugin())
}
