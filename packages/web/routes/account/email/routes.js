/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function accountEmailRoutes (fastify) {
  fastify.post('/', {
    schema: {
      tags: ['html'],
    },
  }, async function postAccountEmailHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Account',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, '/login/?redirect=%2Faccount%2F')
    }

    const fields = request.body && typeof request.body === 'object'
      ? /** @type {Record<string, unknown>} */ (request.body)
      : {}
    const action = stringField(fields['action'])
    const apiResponse = await dispatchEmailAction(fastify, request, fields, action)

    if (apiResponse.statusCode === 202 || apiResponse.statusCode === 204) {
      return redirectForRequest(request, reply, accountMessageUrl(emailSuccessMessage(action)))
    }

    return redirectForRequest(request, reply, accountErrorUrl(responseMessage(apiResponse)))
  })
}

/**
 * @typedef {object} InjectResponse
 * @property {number} statusCode
 * @property {string} statusMessage
 * @property {string} payload
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {Record<string, unknown>} fields
 * @param {string} action
 * @returns {Promise<InjectResponse>}
 */
async function dispatchEmailAction (fastify, request, fields, action) {
  const cookie = request.headers.cookie

  if (action === 'update') {
    return fastify.inject({
      method: 'POST',
      url: '/api/user/email',
      headers: {
        ...(cookie ? { cookie } : {}),
      },
      payload: {
        email: stringField(fields['email']).trim(),
      },
    })
  }

  if (action === 'resend-account') {
    return fastify.inject({
      method: 'POST',
      url: '/api/user/email:resend',
      headers: {
        ...(cookie ? { cookie } : {}),
      },
      payload: {
        update: false,
      },
    })
  }

  if (action === 'resend-update') {
    return fastify.inject({
      method: 'POST',
      url: '/api/user/email:resend',
      headers: {
        ...(cookie ? { cookie } : {}),
      },
      payload: {
        update: true,
      },
    })
  }

  if (action === 'cancel-update') {
    return fastify.inject({
      method: 'DELETE',
      url: '/api/user/email',
      headers: {
        ...(cookie ? { cookie } : {}),
      },
    })
  }

  return fastify.inject({
    method: 'GET',
    url: '/not-found-account-email-action',
  })
}

/**
 * @param {string} action
 * @returns {string}
 */
function emailSuccessMessage (action) {
  if (action === 'update') return 'Email update verification sent.'
  if (action === 'resend-account') return 'Email confirmation resent.'
  if (action === 'resend-update') return 'Email update confirmation resent.'
  if (action === 'cancel-update') return 'Email update canceled.'
  return 'Email updated.'
}

/**
 * @param {InjectResponse} response
 * @returns {string}
 */
function responseMessage (response) {
  try {
    const body = JSON.parse(response.payload)
    if (typeof body.message === 'string') return body.message
    if (typeof body.error === 'string') return body.error
  } catch {}

  return response.payload || `${response.statusCode} ${response.statusMessage}`
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  if (Array.isArray(value)) return String(value.at(-1) ?? '')
  if (value == null) return ''
  return String(value)
}

/**
 * @param {string} message
 * @returns {string}
 */
function accountMessageUrl (message) {
  return `/account/?message=${encodeURIComponent(message)}`
}

/**
 * @param {string} message
 * @returns {string}
 */
function accountErrorUrl (message) {
  return `/account/?error=${encodeURIComponent(message)}`
}
