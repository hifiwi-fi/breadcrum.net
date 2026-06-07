import { redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { updateUser } from '../../api/user/user-actions.js'

const usernamePattern = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Account',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, '/login/?redirect=%2Faccount%2F')
  }

  const fields = formFields(request.body)
  const username = stringField(fields['username']).trim()

  if (!username || username.length > 50 || !usernamePattern.test(username)) {
    return redirectForRequest(request, reply, accountErrorUrl('Username must match the documented account username rules.'))
  }

  const result = await updateUser(fastify, {
    userId: context.user.id,
    user: { username },
  })

  if (!result.ok) {
    return redirectForRequest(request, reply, accountErrorUrl(result.message))
  }

  return redirectForRequest(request, reply, accountMessageUrl('Username updated.'))
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
