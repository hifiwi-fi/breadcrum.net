/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { PasswordResetConfirmFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { confirmPasswordReset } from '../../api/user/password/password-reset-actions.js'
import { passwordResetConfirmPage } from './view.js'

const passwordResetConfirmTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function passwordResetConfirmRoutes (fastify) {
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
  }, async function getPasswordResetConfirmHandler (request, reply) {
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
  }, async function postPasswordResetConfirmHandler (request, reply) {
    const form = passwordResetConfirmForm(request.body)
    const password = passwordField(request.body)
    const errors = validatePasswordResetConfirmForm(form, password)
    let complete = false

    if (errors.length === 0) {
      const result = await confirmPasswordReset(fastify, {
        userId: form.userId,
        token: form.token,
        password,
      })

      if (result.ok) {
        complete = true
      } else {
        errors.push(formError(result.message))
      }
    }

    const context = await createRouteViewContext(fastify, request, {
      title: 'Confirm Password Reset',
    })
    const body = await reply.render(passwordResetConfirmPage, {
      ...context,
      passwordResetConfirm: {
        ...form,
        complete,
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

/**
 * @param {unknown} body
 * @returns {PasswordResetConfirmFormState}
 */
function passwordResetConfirmForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    token: stringField(fields['token']),
    userId: stringField(fields['userId']),
    complete: false,
    errors: [],
  }
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
 * @param {PasswordResetConfirmFormState} form
 * @param {string} password
 * @returns {FormError[]}
 */
function validatePasswordResetConfirmForm (form, password) {
  /** @type {FormError[]} */
  const errors = []

  if (!form.userId) {
    errors.push(formError('Missing userId in reset link. Did you modify the URL?', 'userId'))
  }

  if (!form.token) {
    errors.push(formError('Missing token in reset link. Did you modify the URL?', 'token'))
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
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value : ''
}
