/**
 * @import { FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { UnsubscribeFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { unsubscribeEmail } from '../api/user/email/unsubscribe/unsubscribe-action.js'
import { unsubscribePage } from './view.js'

const unsubscribeTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const form = unsubscribeForm(request.body)
  const errors = validateUnsubscribeForm(form)
  let unsubscribed = false

  if (errors.length === 0) {
    await unsubscribeEmail(fastify, form.email)
    unsubscribed = true
  }

  const context = await createRouteViewContext(fastify, request, {
    title: 'Unsubscribe',
  })
  const body = await reply.render(unsubscribePage, {
    ...context,
    unsubscribe: {
      ...form,
      unsubscribed,
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
    ? fragmentIdFromTarget(request, unsubscribeTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {unknown} body
 * @returns {UnsubscribeFormState}
 */
function unsubscribeForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    email: stringField(fields['email']).trim(),
    unsubscribed: false,
    errors: [],
  }
}

/**
 * @param {UnsubscribeFormState} form
 * @returns {FormError[]}
 */
function validateUnsubscribeForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (form.email.length < 1) {
    errors.push(formError('Email is required.', 'email'))
  } else if (form.email.length > 200) {
    errors.push(formError('Email must be 200 characters or fewer.', 'email'))
  } else if (!form.email.includes('@')) {
    errors.push(formError('Enter a valid email address.', 'email'))
  }

  return errors
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value : ''
}
