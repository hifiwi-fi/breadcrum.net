/**
 * @import { FastifyRequest } from 'fastify'
 */

import { redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { mergeTags } from '../../api/tags/tag-actions.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, { title: 'Merge Tags' })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = tagMergeForm(request.body)
  const result = await mergeTags(fastify, {
    userId: context.user.id,
    sourceNames: form.sourceNames,
    targetName: form.targetName,
  })

  if (!result.ok) {
    reply.status(result.statusCode)
    return reply.send(result.message)
  }

  return redirectForRequest(request, reply, form.redirect)
}

/**
 * @param {unknown} body
 * @returns {{ sourceNames: string[], targetName: string, redirect: string }}
 */
function tagMergeForm (body) {
  const fields = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {}
  const source = fields['source']
  const sourceNames = Array.isArray(source)
    ? source.map(stringField).filter(Boolean)
    : [stringField(source)].filter(Boolean)

  return {
    sourceNames,
    targetName: stringField(fields['target']),
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
