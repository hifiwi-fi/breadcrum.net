/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { deletePasskeyById, updatePasskeyName } from '../../api/user/passkeys/passkey-actions.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * @type {FastifyPluginAsync}
 */
export default async function accountPasskeyRoutes (fastify) {
  fastify.post('/', {
    schema: {
      tags: ['html'],
    },
  }, async function postAccountPasskeyHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Account',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, '/login/?redirect=%2Faccount%2F')
    }

    const fields = formFields(request.body)
    const action = stringField(fields['action'])

    if (action === 'register') {
      return redirectForRequest(request, reply, accountErrorUrl('Passkey registration requires browser WebAuthn.'))
    }

    if (action === 'update') {
      const id = stringField(fields['id'])
      const name = stringField(fields['name']).trim()

      if (!uuidPattern.test(id)) {
        return redirectForRequest(request, reply, accountErrorUrl('Passkey not found.'))
      }

      if (!name || name.length > 100) {
        return redirectForRequest(request, reply, accountErrorUrl('Passkey names must be 1 to 100 characters.'))
      }

      const result = await updatePasskeyName(fastify, {
        userId: context.user.id,
        id,
        name,
      })

      if (!result.ok) {
        return redirectForRequest(request, reply, accountErrorUrl(result.message))
      }

      return redirectForRequest(request, reply, accountMessageUrl('Passkey updated.'))
    }

    if (action === 'delete') {
      const id = stringField(fields['id'])

      if (!uuidPattern.test(id)) {
        return redirectForRequest(request, reply, accountErrorUrl('Passkey not found.'))
      }

      const result = await deletePasskeyById(fastify, {
        userId: context.user.id,
        id,
      })

      if (!result.ok) {
        return redirectForRequest(request, reply, accountErrorUrl(result.message))
      }

      return redirectForRequest(request, reply, accountMessageUrl('Passkey deleted.'))
    }

    return redirectForRequest(request, reply, accountErrorUrl('Unknown passkey action.'))
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
