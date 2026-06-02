/**
 * @import { FastifyInstance, FastifyRequest } from 'fastify'
 * @import { AppFragmentId } from '#views/context.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'

const adminTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {string} title
 * @returns {Promise<import('#views/context.js').ViewContext | import('fastify').FastifyReply>}
 */
export async function createAdminRouteContext (fastify, request, title) {
  const context = await createRouteViewContext(fastify, request, { title })
  return context
}

/**
 * @param {FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {import('#views/context.js').ViewContext} context
 * @returns {import('fastify').FastifyReply | null}
 */
export function adminAccessResponse (request, reply, context) {
  if (!context.user) {
    const redirect = encodeURIComponent(safeRedirectPath(request.url, '/admin/'))
    return redirectForRequest(request, reply, `/login/?redirect=${redirect}`)
  }

  if (!context.user.admin) {
    return reply.forbidden('Admin access required')
  }

  return null
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: AppFragmentId } | undefined}
 */
export function adminRenderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, adminTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}
