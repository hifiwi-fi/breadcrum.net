/**
 * @import { FastifyInstance, FastifyRequest } from 'fastify'
 * @import { TypeUserRead } from '../api/user/schemas/schema-user-read.js'
 * @import { AuthTokenListResult, AuthTokenSortOrder } from '../api/user/auth-tokens/auth-token-actions.js'
 * @import { TypePasskeyReadSerialize } from '../api/user/passkeys/schemas/schema-passkey-read.js'
 * @import { ViewContext } from '#views/context.js'
 */

import { getUser } from '../api/user/user-query.js'
import { listAuthTokensForUser } from '../api/user/auth-tokens/auth-token-actions.js'
import { listPasskeysForUser } from '../api/user/passkeys/passkey-actions.js'

const authTokenCursorPattern = /^\d+:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * @typedef {object} AccountAuthTokenPageState
 * @property {AuthTokenListResult['data']} data
 * @property {AuthTokenListResult['pagination']} pagination
 * @property {string} queryString
 * @property {string | null} createdToken
 */

/**
 * @typedef {object} AccountPageState
 * @property {TypeUserRead} user
 * @property {string} message
 * @property {string} error
 * @property {TypePasskeyReadSerialize[]} passkeys
 * @property {AccountAuthTokenPageState} authTokens
 */

/**
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {ViewContext & { user: NonNullable<ViewContext['user']> }} context
 * @param {Partial<Pick<AccountPageState, 'message' | 'error'>> & { createdToken?: string | null }} [overrides]
 * @returns {Promise<AccountPageState | null>}
 */
export async function loadAccountPageState (fastify, request, context, overrides = {}) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const sortOrder = authTokenSortOrder(url.searchParams.get('sort'))
  const [user, passkeys, authTokens] = await Promise.all([
    getUser({
      fastify,
      userId: context.user.id,
    }),
    listPasskeysForUser(fastify, {
      userId: context.user.id,
    }),
    listAuthTokensForUser({
      fastify,
      userId: context.user.id,
      currentJti: currentJtiForRequest(request),
      beforeCursor: authTokenCursor(url.searchParams.get('before')),
      afterCursor: authTokenCursor(url.searchParams.get('after')),
      perPage: intParam(url.searchParams.get('per_page'), 5, 1, 20),
      sortOrder,
    }),
  ])

  if (!user) return null

  return {
    user,
    message: overrides.message ?? stringParam(url.searchParams.get('message'), 400),
    error: overrides.error ?? stringParam(url.searchParams.get('error'), 400),
    passkeys,
    authTokens: {
      ...authTokens,
      queryString: url.searchParams.toString(),
      createdToken: overrides.createdToken ?? null,
    },
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string | undefined}
 */
export function currentJtiForRequest (request) {
  return typeof request.user?.jti === 'string' ? request.user.jti : undefined
}

/**
 * @param {string | null} value
 * @returns {AuthTokenSortOrder}
 */
function authTokenSortOrder (value) {
  return value === 'asc' ? 'asc' : 'desc'
}

/**
 * @param {string | null} value
 * @returns {string | undefined}
 */
function authTokenCursor (value) {
  return value && authTokenCursorPattern.test(value) ? value : undefined
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
 * @param {string | null} value
 * @param {number} maxLength
 * @returns {string}
 */
function stringParam (value, maxLength) {
  if (!value) return ''
  return value.trim().slice(0, maxLength)
}
