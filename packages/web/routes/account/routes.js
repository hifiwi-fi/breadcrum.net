/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { loadAccountPageState } from './account-page-data.js'
import { accountPage } from './view.js'

const accountTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function accountRoutes (fastify) {
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
  }, async function getAccountHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Account',
    })

    const viewUser = context.user
    if (!viewUser) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const authenticatedContext = {
      ...context,
      user: viewUser,
    }
    const accountPageState = await loadAccountPageState(fastify, request, authenticatedContext)

    if (!accountPageState) {
      return reply.notFound('User not found')
    }

    const body = await reply.render(accountPage, {
      ...authenticatedContext,
      accountPage: accountPageState,
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, accountTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/account/'))
  return `/login/?redirect=${redirect}`
}
