/**
 * @import { RouteContext } from '@domstack/fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { RegisterFormState } from './page.route.js'
 */

import { formError, redirectForRequest } from '#lib/htmx.js'
import { registerUser } from '../api/register/registration-action.js'

const usernamePattern = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/

/**
 * @param {RouteContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const form = registerForm(request.body)
  const password = passwordField(request.body)
  const errors = validateRegisterForm(form, password)

  if (errors.length === 0) {
    const result = await registerUser(fastify, request, reply, {
      username: form.username,
      email: form.email,
      password,
      newsletter_subscription: form.newsletter_subscription,
      turnstile_token: turnstileTokenField(request.body),
    })

    if (result.ok) {
      return redirectForRequest(request, reply, '/docs/tutorial/')
    }

    errors.push(formError(result.message))
  }

  return ctx.renderPage({
    state: {
      register: {
        email: form.email,
        username: form.username,
        newsletter_subscription: form.newsletter_subscription,
        errors,
      },
    },
  })
}

/**
 * @param {unknown} body
 * @returns {RegisterFormState}
 */
function registerForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    email: stringField(fields['email']).trim(),
    username: stringField(fields['username']).trim(),
    newsletter_subscription: checkboxField(fields['newsletter_subscription']),
    registrationOpen: true,
    turnstileRequired: false,
    turnstileSitekey: '',
    errors: [],
  }
}

/**
 * @param {RegisterFormState} form
 * @param {string} password
 * @returns {FormError[]}
 */
function validateRegisterForm (form, password) {
  /** @type {FormError[]} */
  const errors = []

  if (form.email.length < 1) {
    errors.push(formError('Email is required.', 'email'))
  } else if (form.email.length > 200) {
    errors.push(formError('Email must be 200 characters or fewer.', 'email'))
  } else if (!form.email.includes('@')) {
    errors.push(formError('Enter a valid email address.', 'email'))
  }

  if (form.username.length < 1) {
    errors.push(formError('Username is required.', 'username'))
  } else if (form.username.length > 50) {
    errors.push(formError('Username must be 50 characters or fewer.', 'username'))
  } else if (!usernamePattern.test(form.username)) {
    errors.push(formError('Use letters and numbers with ., _, or - between characters.', 'username'))
  }

  if (password.length < 1) {
    errors.push(formError('Password is required.', 'password'))
  } else if (password.length < 8) {
    errors.push(formError('Password must be at least 8 characters.', 'password'))
  } else if (password.length > 255) {
    errors.push(formError('Password must be 255 characters or fewer.', 'password'))
  }

  return errors
}

/**
 * @param {unknown} body
 * @returns {string}
 */
function passwordField (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return stringField(fields['password'])
}

/**
 * @param {unknown} body
 * @returns {string}
 */
function turnstileTokenField (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return stringField(fields['turnstile_token']) || stringField(fields['cf-turnstile-response'])
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
function checkboxField (value) {
  return value === 'true' || value === 'on'
}
