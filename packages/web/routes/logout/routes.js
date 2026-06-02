/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { logoutSession } from '../api/auth/session.js'
import { logoutPage } from './view.js'

const logoutTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function logoutRoutes (fastify) {
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
  }, async function getLogoutHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Logout',
    })
    const body = await reply.render(logoutPage, context, renderOptions(request))

    return reply.send(body)
  })

  fastify.post('/', {
    schema: {
      tags: ['html'],
      response: {
        204: {
          type: 'null',
        },
        302: {
          type: 'null',
        },
      },
    },
  }, async function postLogoutHandler (request, reply) {
    await logoutSession(fastify, request, reply)
    return redirectForRequest(request, reply, '/')
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, logoutTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}
