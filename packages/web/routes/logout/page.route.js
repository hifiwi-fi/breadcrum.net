/**
 * @import { FastifyRequest } from 'fastify'
 */

import { fragmentIdFromTarget, isHtmxRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { logoutPage } from './view.js'

const logoutTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Logout',
  })
  const body = await reply.render(logoutPage, context, renderOptions(request))

  return reply.send(body)
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
