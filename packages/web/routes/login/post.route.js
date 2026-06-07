/**
 * @import { RouteContext } from '@domstack/fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { LoginFormState } from './page.route.js'
 */

import { formError, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { loginWithPassword } from '../api/auth/session.js'

/**
 * @param {RouteContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const form = loginForm(request.body)
  const errors = validateLoginForm(form)

  if (errors.length === 0) {
    const session = await loginWithPassword(fastify, reply, {
      user: form.user,
      password: form.password,
    })

    if (session) {
      return redirectForRequest(request, reply, safeRedirectPath(form.redirect, '/bookmarks/'))
    }

    errors.push(formError('Email, username, or password is incorrect.'))
  }

  return ctx.renderPage({
    state: {
      login: {
        redirect: safeRedirectPath(form.redirect, ''),
        user: form.user,
        errors,
      },
    },
  })
}

/**
 * @param {unknown} body
 * @returns {LoginFormState & { password: string }}
 */
function loginForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    redirect: stringField(fields['redirect']),
    user: stringField(fields['user']).trim(),
    password: stringField(fields['password']),
    errors: [],
  }
}

/**
 * @param {LoginFormState & { password: string }} form
 * @returns {FormError[]}
 */
function validateLoginForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (form.user.length < 1) {
    errors.push(formError('Email or username is required.', 'user'))
  } else if (form.user.length > 200) {
    errors.push(formError('Email or username must be 200 characters or fewer.', 'user'))
  }

  if (form.password.length < 1) {
    errors.push(formError('Password is required.', 'password'))
  } else if (form.password.length < 8) {
    errors.push(formError('Password must be at least 8 characters.', 'password'))
  } else if (form.password.length > 255) {
    errors.push(formError('Password must be 255 characters or fewer.', 'password'))
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
