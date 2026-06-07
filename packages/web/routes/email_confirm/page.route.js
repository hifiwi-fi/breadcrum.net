/**
 * @import { FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { EmailConfirmFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { emailConfirmPage } from './view.js'

const emailConfirmTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Email Confirmation',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = emailConfirmQuery(request)
  const body = await reply.render(emailConfirmPage, {
    ...context,
    emailConfirm: {
      ...form,
      errors: validateEmailConfirmForm(form),
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
    ? fragmentIdFromTarget(request, emailConfirmTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {EmailConfirmFormState}
 */
function emailConfirmQuery (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')

  return {
    token: url.searchParams.get('token') ?? '',
    update: url.searchParams.get('update') === 'true',
    complete: false,
    email: '',
    errors: [],
  }
}

/**
 * @param {EmailConfirmFormState} form
 * @returns {FormError[]}
 */
function validateEmailConfirmForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (!form.token) {
    errors.push(formError('Missing email confirm token', 'token'))
  } else if (form.token.length !== 64) {
    errors.push(formError('Invalid email confirmation token', 'token'))
  }

  return errors
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/email_confirm/'))
  return `/login/?redirect=${redirect}`
}
