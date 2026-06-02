/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { deleteBookmarkById } from '../../api/bookmarks/bookmark-delete-action.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function bookmarkDeleteRoutes (fastify) {
  fastify.post('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        422: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function postBookmarkDeleteHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Delete Bookmark',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const form = bookmarkDeleteForm(request.body)
    if (!form.id) {
      reply.status(422)
      return reply.send('Missing bookmark id')
    }

    const result = await deleteBookmarkById(fastify, {
      userId: context.user.id,
      bookmarkId: form.id,
    })

    if (!result.ok) {
      reply.status(result.statusCode)
      return reply.send(result.message)
    }

    if (isHtmxRequest(request)) {
      return reply.send('')
    }

    return redirectForRequest(request, reply, form.redirect)
  })
}

/**
 * @param {unknown} body
 * @returns {{ id: string, redirect: string }}
 */
function bookmarkDeleteForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    id: stringField(fields['id']),
    redirect: safeRedirectPath(stringField(fields['redirect']), '/bookmarks/'),
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value : ''
}
