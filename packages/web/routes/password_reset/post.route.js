/**
 * @import { RouteContext } from '@domstack/fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { PasswordResetFormState } from './page.route.js'
 */

import { formError } from '#lib/htmx.js'
import { requestPasswordReset } from '../api/user/password/password-reset-actions.js'

/**
 * @param {RouteContext} ctx
 */
export default async function postRoute (ctx) {
  const { request } = ctx
  const fastify = request.server

  const form = passwordResetForm(request.body)
  const errors = validatePasswordResetForm(form)
  let sent = false

  if (errors.length === 0) {
    const result = await requestPasswordReset(fastify, form.email)
    if (result.ok) {
      sent = true
    } else {
      errors.push(formError(result.message, 'email'))
    }
  }

  return ctx.renderPage({
    state: {
      passwordReset: {
        email: form.email,
        sent,
        errors,
      },
    },
  })
}

/**
 * @param {unknown} body
 * @returns {PasswordResetFormState}
 */
function passwordResetForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    email: stringField(fields['email']).trim(),
    sent: false,
    errors: [],
  }
}

/**
 * @param {PasswordResetFormState} form
 * @returns {FormError[]}
 */
function validatePasswordResetForm (form) {
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
