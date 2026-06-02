/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { PasswordResetFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { requestPasswordReset } from '../api/user/password/password-reset-actions.js'
import { passwordResetPage } from './view.js'

const passwordResetTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function passwordResetRoutes (fastify) {
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
  }, async function getPasswordResetHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Password Reset',
    })

    if (context.user) {
      return redirectForRequest(request, reply, '/account/')
    }

    const body = await reply.render(passwordResetPage, {
      ...context,
      passwordReset: {
        email: '',
        sent: false,
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
  }, async function postPasswordResetHandler (request, reply) {
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

    const context = await createRouteViewContext(fastify, request, {
      title: 'Password Reset',
    })
    const body = await reply.render(passwordResetPage, {
      ...context,
      passwordReset: {
        email: form.email,
        sent,
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
    ? fragmentIdFromTarget(request, passwordResetTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
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
