/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { deleteTagByName } from '../../api/tags/tag-actions.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function tagsDeleteRoutes (fastify) {
  fastify.post('/', {
    schema: {
      tags: ['html'],
      response: {
        200: { type: 'string', contentMediaType: 'text/html' },
        404: { type: 'string', contentMediaType: 'text/html' },
        409: { type: 'string', contentMediaType: 'text/html' },
        422: { type: 'string', contentMediaType: 'text/html' },
      },
    },
  }, async function postTagsDeleteHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, { title: 'Delete Tag' })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const form = tagNameForm(request.body)
    const result = await deleteTagByName(fastify, {
      userId: context.user.id,
      name: form.name,
    })

    if (!result.ok) {
      reply.status(result.statusCode)
      return reply.send(result.message)
    }

    return redirectForRequest(request, reply, form.redirect)
  })
}

/**
 * @param {unknown} body
 * @returns {{ name: string, redirect: string }}
 */
function tagNameForm (body) {
  const fields = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {}

  return {
    name: stringField(fields['name']),
    redirect: safeRedirectPath(stringField(fields['redirect']), '/tags/'),
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/tags/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value.trim() : ''
}
