/**
 * @import { FastifyRequest } from 'fastify'
 * @import { PasswordResetConfirmFormState } from './view.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { passwordResetConfirmPage } from './view.js'

const passwordResetConfirmTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Confirm Password Reset',
  })

  if (context.user) {
    return redirectForRequest(request, reply, '/account/')
  }

  const form = passwordResetConfirmQuery(request)
  const body = await reply.render(passwordResetConfirmPage, {
    ...context,
    passwordResetConfirm: form,
  }, renderOptions(request))

  return reply.send(body)
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, passwordResetConfirmTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {PasswordResetConfirmFormState}
 */
function passwordResetConfirmQuery (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')

  return {
    token: url.searchParams.get('token') ?? '',
    userId: url.searchParams.get('user_id') ?? '',
    complete: false,
    errors: [],
  }
}
