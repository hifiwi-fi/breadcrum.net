/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { fragmentIdFromTarget, isHtmxRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { homePage } from './home.view.js'
import { registerGeneratedRoutes } from './generated/generated-routes.js'

const rootTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function rootRoutes (fastify) {
  await registerGeneratedRoutes(fastify)

  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function homeRouteHandler (request, reply) {
    const fragmentId = isHtmxRequest(request)
      ? fragmentIdFromTarget(request, rootTargetFragments, 'main')
      : null
    const context = await createRouteViewContext(fastify, request, {
      title: 'Home',
    })
    const body = await reply.render(homePage, context, fragmentId ? { fragmentId } : undefined)

    return reply.send(body)
  })
}
