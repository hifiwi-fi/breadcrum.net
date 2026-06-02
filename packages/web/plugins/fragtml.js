/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import fp from 'fastify-plugin'
import fastifyFragtml, { defineFastifyFragtmlOptions } from 'fastify-fragtml'
import { getHtmxContext } from '#lib/htmx.js'
import { createDefaultViewContext } from '#views/context.js'
import { layouts } from '#views/layouts.js'

/**
 * @type {FastifyPluginAsync}
 */
async function fragtmlPlugin (fastify) {
  await fastify.register(fastifyFragtml, defineFastifyFragtmlOptions({
    defaultContext: createDefaultViewContext(fastify),
    layout: 'root',
    layouts,
  }))

  fastify.addHook('preHandler', async (request, reply) => {
    reply.locals = {
      ...reply.locals,
      currentPath: request.url,
      htmx: getHtmxContext(request),
    }
  })
}

export default fp(fragtmlPlugin, {
  name: 'fragtml',
  dependencies: ['env', 'pkg'],
})
