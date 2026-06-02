/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { updateUser } from '../../api/user/user-actions.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function accountPasswordRoutes (fastify) {
  fastify.post('/', {
    schema: {
      tags: ['html'],
    },
  }, async function postAccountPasswordHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Account',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, '/login/?redirect=%2Faccount%2F')
    }

    const fields = formFields(request.body)
    const password = stringField(fields['password'])
    const confirmPassword = stringField(fields['confirmPassword'])

    if (password.length < 8 || password.length > 255) {
      return redirectForRequest(request, reply, accountErrorUrl('Password must be between 8 and 255 characters.'))
    }

    if (password !== confirmPassword) {
      return redirectForRequest(request, reply, accountErrorUrl('Passwords do not match.'))
    }

    await updateUser(fastify, {
      userId: context.user.id,
      user: { password },
    })

    return redirectForRequest(request, reply, accountMessageUrl('Password updated.'))
  })
}

/**
 * @param {unknown} body
 * @returns {Record<string, unknown>}
 */
function formFields (body) {
  return body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {}
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
