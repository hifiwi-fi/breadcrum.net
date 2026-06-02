/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { listAdminUsersForAdmin } from '../../api/admin/users/admin-user-actions.js'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminUsersPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminUsersRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
    },
  }, async function getAdminUsersHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Admin users')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const url = new URL(request.url, 'https://breadcrum.invalid')
    const result = await listAdminUsersForAdmin({
      fastify,
      before: dateParam(url.searchParams.get('before')),
      after: dateParam(url.searchParams.get('after')),
      perPage: intParam(url.searchParams.get('per_page'), 20, 1, 200),
      username: stringParam(url.searchParams.get('username'), 50) || undefined,
    })
    const body = await reply.render(adminUsersPage, {
      ...context,
      adminUsers: {
        users: result.data,
        pagination: result.pagination,
        queryString: url.searchParams.toString(),
        message: stringParam(url.searchParams.get('message'), 400),
        error: stringParam(url.searchParams.get('error'), 400),
        single: false,
      },
    }, adminRenderOptions(request))

    return reply.send(body)
  })

  fastify.post('/', {
    schema: {
      tags: ['html'],
    },
  }, async function postAdminUsersHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Admin users')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const fields = formFields(request.body)
    const action = stringField(fields['action'])
    const id = stringField(fields['id'])
    const redirect = safeRedirectPath(stringField(fields['redirect']), '/admin/users/')

    if (!id) {
      return redirectForRequest(request, reply, withError(redirect, 'User id is required.'))
    }

    if (action === 'update') {
      const apiResponse = await fastify.inject({
        method: 'PUT',
        url: `/api/admin/users/${id}`,
        headers: cookieHeaders(request),
        payload: userUpdatePayload(fields),
      })

      if (apiResponse.statusCode === 202) {
        return redirectForRequest(request, reply, withMessage(redirect, 'User updated.'))
      }

      return redirectForRequest(request, reply, withError(redirect, responseMessage(apiResponse)))
    }

    if (action === 'delete') {
      const apiResponse = await fastify.inject({
        method: 'DELETE',
        url: `/api/admin/users/${id}`,
        headers: cookieHeaders(request),
      })

      if (apiResponse.statusCode === 200) {
        return redirectForRequest(request, reply, withMessage('/admin/users/', 'User deleted.'))
      }

      return redirectForRequest(request, reply, withError(redirect, responseMessage(apiResponse)))
    }

    return redirectForRequest(request, reply, withError(redirect, 'Unknown user action.'))
  })
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, string | boolean | null>}
 */
function userUpdatePayload (fields) {
  return {
    username: stringField(fields['username']).trim(),
    email: stringField(fields['email']).trim(),
    email_confirmed: booleanField(fields['email_confirmed']),
    pending_email_update: nullableStringField(fields['pending_email_update']),
    newsletter_subscription: booleanField(fields['newsletter_subscription']),
    disabled_email: booleanField(fields['disabled_email']),
    disabled: booleanField(fields['disabled']),
    disabled_reason: nullableStringField(fields['disabled_reason']),
    internal_note: nullableStringField(fields['internal_note']),
  }
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
 * @param {unknown} value
 * @returns {string | null}
 */
function nullableStringField (value) {
  const stringValue = stringField(value).trim()
  return stringValue || null
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function booleanField (value) {
  const stringValue = stringField(value)
  return stringValue === 'true' || stringValue === 'on' || stringValue === '1'
}

/**
 * @param {string | null} value
 * @param {number} maxLength
 * @returns {string}
 */
function stringParam (value, maxLength) {
  if (!value) return ''
  return value.trim().slice(0, maxLength)
}

/**
 * @param {string | null} value
 * @returns {string | undefined}
 */
function dateParam (value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString()
}

/**
 * @param {string | null} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function intParam (value, defaultValue, min, max) {
  if (!value) return defaultValue
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return defaultValue
  return Math.max(min, Math.min(parsed, max))
}

/**
 * @param {FastifyRequest} request
 * @returns {Record<string, string>}
 */
function cookieHeaders (request) {
  return request.headers.cookie ? { cookie: request.headers.cookie } : {}
}

/**
 * @param {string} redirect
 * @param {string} message
 * @returns {string}
 */
function withMessage (redirect, message) {
  return withParam(redirect, 'message', message)
}

/**
 * @param {string} redirect
 * @param {string} message
 * @returns {string}
 */
function withError (redirect, message) {
  return withParam(redirect, 'error', message)
}

/**
 * @param {string} redirect
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
function withParam (redirect, key, value) {
  const url = new URL(redirect, 'https://breadcrum.invalid')
  url.searchParams.delete('message')
  url.searchParams.delete('error')
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}`
}

/**
 * @param {{ statusCode: number, statusMessage: string, payload: string }} response
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
