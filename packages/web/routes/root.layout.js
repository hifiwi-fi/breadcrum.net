/**
 * @import { FastifyReply, FastifyRequest } from 'fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { ViewContext } from '#views/context.js'
 */

import { fragmentIdFromTarget, isHtmxRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { layouts } from '#views/layouts.js'

const rootTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {object} context
 * @param {HtmlRenderable} context.children
 * @param {FastifyRequest} [context.request]
 * @param {FastifyReply} [context.reply]
 * @param {{ context?: ViewContext }} [context.data]
 * @param {Record<string, unknown>} context.vars
 */
export default async function rootLayout ({ children, request, reply, data, vars }) {
  if (reply?.sent) return ''

  const viewContext = data?.context ?? await createFallbackContext(request, vars)
  const fragmentId = request && isHtmxRequest(request)
    ? fragmentIdFromTarget(request, rootTargetFragments, 'main')
    : null
  const root = typeof layouts.root === 'function'
    ? { render: layouts.root }
    : layouts.root

  return root.render(children, viewContext, fragmentId ? { fragmentId } : {})
}

/**
 * @param {FastifyRequest | undefined} request
 * @param {Record<string, unknown>} vars
 * @returns {Promise<ViewContext>}
 */
async function createFallbackContext (request, vars) {
  if (!request) {
    throw new Error('Domstack app layout requires request context or data.context')
  }

  return createRouteViewContext(request.server, request, {
    title: typeof vars['title'] === 'string' ? vars['title'] : '',
  })
}
