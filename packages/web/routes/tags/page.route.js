/**
 * @import { FastifyRequest } from 'fastify'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { listTags } from '../api/tags/tag-actions.js'
import { tagsPage } from './view.js'

const tagsTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Tags',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const sensitive = tagsSensitiveFilter(request)
  const body = await reply.render(tagsPage, {
    ...context,
    tagsPage: {
      sensitive,
      tags: await listTags(fastify, {
        userId: context.user.id,
        sensitive,
      }),
    },
  }, renderOptions(request))

  return reply.send(body)
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, tagsTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {boolean}
 */
function tagsSensitiveFilter (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  return url.searchParams.get('sensitive') === 'true'
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/tags/'))
  return `/login/?redirect=${redirect}`
}
