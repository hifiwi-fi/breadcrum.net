import SQL from '@nearform/sql'

/**
 * @import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
 * @import { QueryResult } from 'pg'
 */

/**
 * @typedef {object} PasswordLoginCredentials
 * @property {string} user
 * @property {string} password
 */

/**
 * @typedef {object} PasswordLoginUser
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {boolean} newsletter_subscription
 * @property {boolean} admin
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {object} PasswordLoginUserRow
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {boolean} newsletter_subscription
 * @property {boolean} admin
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {object} PasswordLoginResult
 * @property {PasswordLoginUser} user
 * @property {string} token
 */

/**
 * Authenticates a user/password pair and sets the signed JWT session cookie.
 *
 * @param {FastifyInstance} fastify
 * @param {FastifyReply} reply
 * @param {PasswordLoginCredentials} credentials
 * @returns {Promise<PasswordLoginResult | null>}
 */
export async function loginWithPassword (fastify, reply, credentials) {
  const isEmail = credentials.user.includes('@')
  const query = SQL`
    select
      id,
      email,
      username,
      email_confirmed,
      newsletter_subscription,
      admin,
      created_at,
      updated_at
    from users
    where ${isEmail ? SQL`email = ${credentials.user}` : SQL`username = ${credentials.user}`}
    and password = crypt(${credentials.password}, password)
    limit 1;
  `

  /** @type {QueryResult<PasswordLoginUserRow>} */
  const results = await fastify.pg.query(query)
  const row = results.rows[0]
  if (!row) return null

  const user = serializePasswordLoginUser(row)

  const token = await reply.createJWTToken({ id: user.id, username: user.username }, 'web')
  reply.setJWTCookie(token)

  return { user, token }
}

/**
 * Deletes the current JWT session if one is present and clears the session cookie.
 *
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @returns {Promise<boolean>}
 */
export async function logoutSession (fastify, request, reply) {
  let validJWT = false

  try {
    await request.jwtVerify()
    validJWT = true
  } catch (err) {
    request.log.warn({ err }, 'Invalid JWT received')
  }

  if (validJWT) {
    const query = SQL`
      delete from auth_tokens
      where jti = ${request.user.jti} and owner_id = ${request.user.id};
    `

    try {
      await fastify.pg.query(query)
      request.log.info(`Deleted ${request.user.jti} for ${request.user.username}`)
    } catch (err) {
      request.log.error(new Error('Error deleting JWT from db', { cause: err }))
    }
  }

  reply.deleteJWTCookie()

  return validJWT
}

/**
 * @param {PasswordLoginUserRow} user
 * @returns {PasswordLoginUser}
 */
function serializePasswordLoginUser (user) {
  return {
    ...user,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  }
}
