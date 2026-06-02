/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from './admin-route-utils.js'
import { adminIndexPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminRoutes (fastify) {
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
  }, async function getAdminHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Admin')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const body = await reply.render(adminIndexPage, context, adminRenderOptions(request))
    return reply.send(body)
  })
}
