/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { listTags } from '../api/tags/tag-actions.js'
import { tagsPage } from './view.js'

const tagsTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function tagsRoutes (fastify) {
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
  }, async function getTagsHandler (request, reply) {
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
  })
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
