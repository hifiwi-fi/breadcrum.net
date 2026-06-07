/**
 * @import { FastifyReply, FastifyRequest } from 'fastify'
 * @import { ViewContext } from '#views/context.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { createAuthTokenForReply, deleteAuthTokenByJti, updateAuthToken } from '../../api/user/auth-tokens/auth-token-actions.js'
import { accountPage } from '../view.js'
import { currentJtiForRequest, loadAccountPageState } from '../account-page-data.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const accountTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Account',
  })

  const viewUser = context.user
  if (!viewUser) {
    return redirectForRequest(request, reply, '/login/?redirect=%2Faccount%2F')
  }

  const authenticatedContext = {
    ...context,
    user: viewUser,
  }
  const fields = formFields(request.body)
  const action = stringField(fields['action'])

  if (action === 'create') {
    return createToken(fastify, request, reply, authenticatedContext, fields)
  }

  if (action === 'update') {
    return updateToken(fastify, request, reply, authenticatedContext, fields)
  }

  if (action === 'delete') {
    return deleteToken(fastify, request, reply, authenticatedContext, fields)
  }

  return redirectForRequest(request, reply, accountErrorUrl('Unknown auth token action.'))
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {ViewContext & { user: NonNullable<ViewContext['user']> }} context
 * @param {Record<string, unknown>} fields
 * @returns {Promise<FastifyReply>}
 */
async function createToken (fastify, request, reply, context, fields) {
  const note = noteField(fields['note'])
  if (note && note.length > 255) {
    return redirectForRequest(request, reply, accountErrorUrl('Auth token notes must be 255 characters or fewer.'))
  }

  const result = await createAuthTokenForReply(fastify, reply, {
    userId: context.user.id,
    username: context.user.username,
    currentJti: currentJtiForRequest(request),
    note,
    protect: booleanField(fields['protect']),
  })

  return renderAccountPage(fastify, request, reply, context, {
    message: 'Auth token created.',
    error: '',
    createdToken: result.token,
  })
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {ViewContext & { user: NonNullable<ViewContext['user']> }} context
 * @param {Record<string, unknown>} fields
 * @returns {Promise<FastifyReply>}
 */
async function updateToken (fastify, request, reply, context, fields) {
  const jti = stringField(fields['jti'])
  const note = noteField(fields['note'])

  if (!uuidPattern.test(jti)) {
    return redirectForRequest(request, reply, accountErrorUrl('Auth token not found.'))
  }

  if (note && note.length > 255) {
    return redirectForRequest(request, reply, accountErrorUrl('Auth token notes must be 255 characters or fewer.'))
  }

  const result = await updateAuthToken(fastify, {
    userId: context.user.id,
    currentJti: currentJtiForRequest(request),
    jti,
    note,
    protect: booleanField(fields['protect']),
  })

  if (!result.ok) {
    return redirectForRequest(request, reply, accountErrorUrl(result.message))
  }

  return redirectForRequest(request, reply, accountMessageUrl('Auth token updated.'))
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {ViewContext & { user: NonNullable<ViewContext['user']> }} context
 * @param {Record<string, unknown>} fields
 * @returns {Promise<FastifyReply>}
 */
async function deleteToken (fastify, request, reply, context, fields) {
  const jti = stringField(fields['jti'])

  if (!uuidPattern.test(jti)) {
    return redirectForRequest(request, reply, accountErrorUrl('Auth token not found.'))
  }

  const result = await deleteAuthTokenByJti(fastify, {
    userId: context.user.id,
    currentJti: currentJtiForRequest(request),
    jti,
  })

  if (!result.ok) {
    return redirectForRequest(request, reply, accountErrorUrl(result.message))
  }

  return redirectForRequest(request, reply, accountMessageUrl('Auth token revoked.'))
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {ViewContext & { user: NonNullable<ViewContext['user']> }} context
 * @param {Partial<import('../account-page-data.js').AccountPageState> & { createdToken?: string | null }} overrides
 * @returns {Promise<FastifyReply>}
 */
async function renderAccountPage (fastify, request, reply, context, overrides) {
  const accountPageState = await loadAccountPageState(fastify, request, context, overrides)

  if (!accountPageState) {
    return reply.notFound('User not found')
  }

  const body = await reply.render(accountPage, {
    ...context,
    accountPage: accountPageState,
  }, renderOptions(request))

  return reply.code(200).send(body)
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, accountTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
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
function noteField (value) {
  const note = stringField(value).trim()
  return note || null
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function booleanField (value) {
  const field = stringField(value)
  return field === 'true' || field === 'on' || field === '1'
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
