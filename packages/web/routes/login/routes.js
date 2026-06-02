/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { LoginFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { loginWithPassword } from '../api/auth/session.js'
import { loginPage } from './view.js'

const loginTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function loginRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function getLoginHandler (request, reply) {
    const redirect = redirectFromRequest(request, '')
    const context = await createRouteViewContext(fastify, request, {
      title: 'Login',
    })

    if (context.user) {
      return redirectForRequest(request, reply, redirect || '/bookmarks/')
    }

    const body = await reply.render(loginPage, {
      ...context,
      login: {
        redirect,
        user: '',
        errors: [],
      },
    }, renderOptions(request))

    return reply.send(body)
  })

  fastify.post('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function postLoginHandler (request, reply) {
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

    const context = await createRouteViewContext(fastify, request, {
      title: 'Login',
    })
    const body = await reply.render(loginPage, {
      ...context,
      login: {
        redirect: safeRedirectPath(form.redirect, ''),
        user: form.user,
        errors,
      },
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, loginTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
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
 * @param {FastifyRequest} request
 * @param {string} fallback
 * @returns {string}
 */
function redirectFromRequest (request, fallback) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  return safeRedirectPath(url.searchParams.get('redirect'), fallback)
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value : ''
}
