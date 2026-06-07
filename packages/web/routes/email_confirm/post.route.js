/**
 * @import { FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { EmailConfirmFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { confirmEmail } from '../api/user/email/verify-email-action.js'
import { emailConfirmPage } from './view.js'

const emailConfirmTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const initialContext = await createRouteViewContext(fastify, request, {
    title: 'Email Confirmation',
  })

  if (!initialContext.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = emailConfirmForm(request.body)
  const errors = validateEmailConfirmForm(form)
  let complete = false
  let email = ''

  if (errors.length === 0) {
    const result = await confirmEmail(fastify, {
      userId: initialContext.user.id,
      token: form.token,
      update: form.update,
    })

    if (result.ok) {
      complete = true
      email = result.email
    } else {
      errors.push(formError(result.message))
    }
  }

  const context = complete
    ? await createRouteViewContext(fastify, request, { title: 'Email Confirmation' })
    : initialContext
  const body = await reply.render(emailConfirmPage, {
    ...context,
    emailConfirm: {
      ...form,
      complete,
      email,
      errors,
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
 * @param {unknown} body
 * @returns {EmailConfirmFormState}
 */
function emailConfirmForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    token: stringField(fields['token']),
    update: booleanField(fields['update']),
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

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value : ''
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function booleanField (value) {
  return value === true || value === 'true' || value === 'on'
}
