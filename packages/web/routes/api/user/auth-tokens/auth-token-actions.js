/**
 * @import { FastifyInstance, FastifyReply } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { JwtUserWithTokenId } from '../../../../plugins/jwt.js'
 * @import { TypeAuthTokenReadSerialize } from './schemas/schema-auth-token-read.js'
 */

import SQL from '@nearform/sql'
import { getAuthTokens } from './get-auth-tokens-query.js'
import { getSingleAuthToken } from './_jti/get-single-auth-token-query.js'

/**
 * @typedef {'asc' | 'desc'} AuthTokenSortOrder
 */

/**
 * @typedef {object} AuthTokenPagination
 * @property {string | null} before
 * @property {string | null} after
 * @property {boolean} top
 * @property {boolean} bottom
 */

/**
 * @typedef {object} AuthTokenListResult
 * @property {TypeAuthTokenReadSerialize[]} data
 * @property {AuthTokenPagination} pagination
 */

/**
 * @typedef {object} AuthTokenActionError
 * @property {false} ok
 * @property {400 | 404} statusCode
 * @property {string} message
 */

/**
 * @typedef {object} AuthTokenUpdateSuccess
 * @property {true} ok
 * @property {TypeAuthTokenReadSerialize} authToken
 */

/**
 * @typedef {object} AuthTokenDeleteSuccess
 * @property {true} ok
 */

/**
 * @param {object} params
 * @param {FastifyInstance} params.fastify
 * @param {PgClient} [params.pg]
 * @param {string} params.userId
 * @param {string | undefined} [params.currentJti]
 * @param {string | undefined} [params.beforeCursor]
 * @param {string | undefined} [params.afterCursor]
 * @param {number} params.perPage
 * @param {AuthTokenSortOrder} params.sortOrder
 * @returns {Promise<AuthTokenListResult>}
 */
export async function listAuthTokensForUser ({
  fastify,
  pg,
  userId,
  currentJti,
  beforeCursor,
  afterCursor,
  perPage,
  sortOrder,
}) {
  const client = pg ?? fastify.pg
  const pageSize = Math.max(1, Math.min(perPage, 100))
  const tokensWithMicros = await getAuthTokens({
    fastify,
    pg: client,
    userId,
    beforeCursor,
    afterCursor,
    perPage: pageSize + 1,
    sortOrder,
    ...(currentJti ? { currentJti } : {}),
  })

  const top = Boolean(
    (!beforeCursor && !afterCursor) ||
    (afterCursor && tokensWithMicros.length <= pageSize)
  )
  const bottom = Boolean(
    (beforeCursor && tokensWithMicros.length <= pageSize) ||
    (!beforeCursor && !afterCursor && tokensWithMicros.length <= pageSize)
  )

  if (tokensWithMicros.length > pageSize) {
    if (afterCursor) {
      tokensWithMicros.shift()
    } else {
      tokensWithMicros.pop()
    }
  }

  let nextPage = null
  let prevPage = null

  if (!bottom && tokensWithMicros.length > 0) {
    const lastToken = tokensWithMicros.at(-1)
    nextPage = lastToken ? `${lastToken.last_seen_micros}:${lastToken.jti}` : null
  }

  if (!top && tokensWithMicros.length > 0) {
    const firstToken = tokensWithMicros[0]
    prevPage = firstToken ? `${firstToken.last_seen_micros}:${firstToken.jti}` : null
  }

  const geoipLookup = fastify.geoip?.lookup

  /** @type {TypeAuthTokenReadSerialize[]} */
  const tokens = tokensWithMicros.map(({ last_seen_micros: _unused, ...token }) => ({
    ...token,
    geoip: geoipLookup && token.ip
      ? geoipLookup(token.ip)
      : null,
  }))

  return {
    data: tokens,
    pagination: {
      before: nextPage,
      after: prevPage,
      top,
      bottom,
    },
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {FastifyReply} reply
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.username
 * @param {string | undefined} [params.currentJti]
 * @param {string | null | undefined} [params.note]
 * @param {boolean | undefined} [params.protect]
 * @returns {Promise<{ token: string, auth_token: TypeAuthTokenReadSerialize }>}
 */
export async function createAuthTokenForReply (fastify, reply, {
  userId,
  username,
  currentJti,
  note,
  protect,
}) {
  const token = await reply.createJWTToken({
    id: userId,
    username,
    note: normalizeNote(note),
    protect: Boolean(protect),
  }, 'api')

  /** @type {JwtUserWithTokenId | null} */
  const decodedToken = fastify.jwt.decode(token)
  if (!decodedToken) {
    throw new Error('Failed to decode JWT token')
  }

  const authToken = await getSingleAuthToken({
    fastify,
    userId,
    jti: decodedToken.jti,
    ...(currentJti ? { currentJti } : {}),
  })

  if (!authToken) {
    throw new Error('Failed to retrieve created auth token')
  }

  return {
    token,
    auth_token: authToken,
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string | undefined} [params.currentJti]
 * @param {string} params.jti
 * @param {string | null | undefined} [params.note]
 * @param {boolean | undefined} [params.protect]
 * @returns {Promise<AuthTokenUpdateSuccess | AuthTokenActionError>}
 */
export async function updateAuthToken (fastify, {
  userId,
  currentJti,
  jti,
  note,
  protect,
}) {
  const existing = await getSingleAuthToken({
    fastify,
    userId,
    jti,
    ...(currentJti ? { currentJti } : {}),
  })

  if (!existing) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Auth token not found',
    }
  }

  const updateFields = []
  if (note !== undefined) {
    updateFields.push(SQL`note = ${normalizeNote(note)}`)
  }
  if (protect !== undefined) {
    updateFields.push(SQL`protect = ${protect}`)
  }

  if (updateFields.length > 0) {
    const updateQuery = SQL`
      UPDATE auth_tokens
      SET ${SQL.glue(updateFields, ', ')}
      WHERE jti = ${jti}
        AND owner_id = ${userId}
    `

    await fastify.pg.query(updateQuery)
  }

  const updatedToken = await getSingleAuthToken({
    fastify,
    userId,
    jti,
    ...(currentJti ? { currentJti } : {}),
  })

  if (!updatedToken) {
    throw new Error('Failed to retrieve updated token')
  }

  return {
    ok: true,
    authToken: updatedToken,
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string | undefined} [params.currentJti]
 * @param {string} params.jti
 * @returns {Promise<AuthTokenDeleteSuccess | AuthTokenActionError>}
 */
export async function deleteAuthTokenByJti (fastify, {
  userId,
  currentJti,
  jti,
}) {
  if (jti === currentJti) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Cannot delete the current session token',
    }
  }

  const query = SQL`
    DELETE FROM auth_tokens
    WHERE jti = ${jti}
      AND owner_id = ${userId}
  `

  const result = await fastify.pg.query(query)

  if (result.rowCount === 0) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Auth token not found',
    }
  }

  return { ok: true }
}

/**
 * @param {string | null | undefined} note
 * @returns {string | null}
 */
function normalizeNote (note) {
  if (note == null) return null
  const trimmed = note.trim()
  return trimmed || null
}
