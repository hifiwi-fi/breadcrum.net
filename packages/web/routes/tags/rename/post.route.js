/**
 * @import { FastifyRequest } from 'fastify'
 */

import { redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { renameTag } from '../../api/tags/tag-actions.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, { title: 'Rename Tag' })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = tagRenameForm(request.body)
  const result = await renameTag(fastify, {
    userId: context.user.id,
    oldName: form.oldName,
    newName: form.newName,
  })

  if (!result.ok) {
    reply.status(result.statusCode)
    return reply.send(result.message)
  }

  return redirectForRequest(request, reply, form.redirect)
}

/**
 * @param {unknown} body
 * @returns {{ oldName: string, newName: string, redirect: string }}
 */
function tagRenameForm (body) {
  const fields = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {}

  return {
    oldName: stringField(fields['old']),
    newName: stringField(fields['new']),
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
