/**
 * @import { FastifyRequest } from 'fastify'
 * @import { RouteContext } from '@domstack/fastify'
 * @import { BookmarkToggleField } from '../../api/bookmarks/bookmark-toggle-action.js'
 */

import { isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { render } from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { toggleBookmarkField } from '../../api/bookmarks/bookmark-toggle-action.js'
import { bookmarkView } from '../bookmark.view.js'

/**
 * @param {RouteContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Bookmark Toggle',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = bookmarkToggleForm(request.body)
  if (!form.id || !form.field) {
    reply.status(422)
    return reply.send('Missing bookmark toggle fields')
  }

  const result = await toggleBookmarkField(fastify, {
    userId: context.user.id,
    bookmarkId: form.id,
    field: form.field,
  })

  if (!result.ok) {
    reply.status(result.statusCode)
    return reply.send(result.message)
  }

  if (isHtmxRequest(request)) {
    const body = await render(bookmarkView(result.bookmark, { redirectPath: form.redirect }))
    return reply.send(body)
  }

  return redirectForRequest(request, reply, form.redirect)
}

/**
 * @param {unknown} body
 * @returns {{ id: string, field: BookmarkToggleField | '', redirect: string }}
 */
function bookmarkToggleForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}
  const field = stringField(fields['field'])

  return {
    id: stringField(fields['id']),
    field: isBookmarkToggleField(field) ? field : '',
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
 * @param {string} value
 * @returns {value is BookmarkToggleField}
 */
function isBookmarkToggleField (value) {
  return value === 'toread' || value === 'starred' || value === 'sensitive'
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value : ''
}
