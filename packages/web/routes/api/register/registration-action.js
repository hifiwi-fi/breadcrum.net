/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { request as undiciRequest } from 'undici'
import { resolveEmail } from 'resolve-email'
import { EMAIL_CONFIRM_TOKEN, EMAIL_CONFIRM_TOKEN_EXP } from '../user/email/email-confirm-tokens.js'
import { verifyEmailBody } from '../user/email/resend-account-confirmation.js'
import { getPasswordHashQuery } from '../user/password/password-hash.js'

/**
 * @import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
 * @import { QueryResult } from 'pg'
 */

/**
 * @typedef {object} RegisterInput
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {boolean} newsletter_subscription
 * @property {string} [turnstile_token]
 */

/**
 * @typedef {object} RegisteredUser
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
 * @typedef {object} RegisteredUserRow
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {string} email_verify_token
 * @property {boolean} newsletter_subscription
 * @property {boolean} admin
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {{ ok: true, user: RegisteredUser, token: string }} RegisterSuccess
 */

/**
 * @typedef {{ ok: false, statusCode: 403 | 409 | 422, message: string }} RegisterFailure
 */

/**
 * @typedef {RegisterSuccess | RegisterFailure} RegisterResult
 */

/**
 * Registers a user, creates a web session cookie, and sends email verification.
 *
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {RegisterInput} input
 * @returns {Promise<RegisterResult>}
 */
export async function registerUser (fastify, request, reply, input) {
  const userAgent = request.headers['user-agent']
  const ip = Array.isArray(request.ips) ? request.ips.at(-1) : request.ip

  const validationFailure = await validateRegistration(fastify, request, input, ip)
  if (validationFailure) return validationFailure

  /** @type {Promise<unknown>} */
  let emailSendJob = Promise.resolve()

  const result = await fastify.pg.transact(async client => {
    const { registration } = await fastify.getFlags({
      pgClient: client,
      frontend: true,
      backend: false,
    })

    if (!registration) {
      return registerFailure(403, 'Registration is closed. Please try again later.')
    }

    const usernameResults = await client.query(SQL`
      select u.username
      from users u
      where u.username = ${input.username}
      fetch first 1 row only;
    `)

    if (usernameResults.rows.length > 0) {
      return registerFailure(409, 'Username is already taken.')
    }

    const emailResults = await client.query(SQL`
      select u.email
      from users u
      where u.email = ${input.email}
      fetch first 1 row only;
    `)

    if (emailResults.rows.length > 0) {
      return registerFailure(409, 'Email is already taken.')
    }

    if (fastify.config.EMAIL_VALIDATION) {
      const { emailResolves, mxRecords, error: emailError } = await resolveEmail(input.email)

      request.log[emailError ? 'error' : 'info']({
        email: input.email,
        emailResolves,
        mxRecords,
        emailError,
      })

      if (!emailResolves) {
        return registerFailure(422, 'There are problems with this email address, please try a different one.')
      }
    }

    const query = SQL`
      insert into users (
        username,
        email,
        password,
        email_verify_token,
        email_verify_token_exp,
        newsletter_subscription,
        registration_ip,
        registration_user_agent
      ) values (
        ${input.username},
        ${input.email},
        ${getPasswordHashQuery(input.password)},
        ${EMAIL_CONFIRM_TOKEN},
        ${EMAIL_CONFIRM_TOKEN_EXP},
        ${input.newsletter_subscription},
        ${ip || null}::inet,
        ${userAgent || null}
      )
      returning
        id,
        email,
        username,
        email_confirmed,
        email_verify_token,
        newsletter_subscription,
        admin,
        created_at,
        updated_at;
    `

    /** @type {QueryResult<RegisteredUserRow>} */
    const results = await client.query(query)
    const userRow = results.rows[0]
    if (!userRow) {
      return registerFailure(422, 'Registration failed.')
    }

    const user = serializeRegisteredUser(userRow)

    emailSendJob = fastify.sendEmail({
      toEmail: input.email,
      subject: 'Verify your account email address',
      text: verifyEmailBody({
        username: user.username,
        host: fastify.config.HOST,
        transport: fastify.config.TRANSPORT,
        token: userRow.email_verify_token,
      }),
    })

    return registerSuccess(user)
  })

  if (!result.ok) return result

  const token = await reply.createJWTToken({ id: result.user.id, username: result.user.username }, 'web')
  reply.setJWTCookie(token)
  fastify.otel.userCreatedCounter.add(1)

  await emailSendJob

  return {
    ok: true,
    user: result.user,
    token,
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {RegisterInput} input
 * @param {string | undefined} ip
 * @returns {Promise<RegisterFailure | null>}
 */
async function validateRegistration (fastify, request, input, ip) {
  if (!fastify.config.TURNSTILE_VALIDATE) return null

  if (!input.turnstile_token) {
    return registerFailure(422, 'Turnstile verification failed.')
  }

  const params = new URLSearchParams({
    secret: fastify.config.TURNSTILE_SECRET_KEY,
    response: input.turnstile_token,
  })

  if (ip) {
    params.set('remoteip', ip)
  }

  try {
    const { statusCode, body } = await undiciRequest('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const result = /** @type {{ success?: boolean, 'error-codes'?: string[] }} */ (await body.json())

    if (statusCode < 200 || statusCode >= 300) {
      request.log.warn({ status: statusCode, result }, 'Turnstile verification request failed.')
      return registerFailure(422, 'Turnstile verification failed.')
    }

    if (!result?.success) {
      request.log.info({ errors: result?.['error-codes'] }, 'Turnstile verification failed.')
      return registerFailure(422, 'Turnstile verification failed.')
    }
  } catch (error) {
    request.log.error({ err: error }, 'Turnstile verification error.')
    return registerFailure(422, 'Turnstile verification failed.')
  }

  return null
}

/**
 * @param {RegisteredUserRow} user
 * @returns {RegisteredUser}
 */
function serializeRegisteredUser (user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    email_confirmed: user.email_confirmed,
    newsletter_subscription: user.newsletter_subscription,
    admin: user.admin,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  }
}

/**
 * @param {RegisteredUser} user
 * @returns {{ ok: true, user: RegisteredUser }}
 */
function registerSuccess (user) {
  return {
    ok: true,
    user,
  }
}

/**
 * @param {403 | 409 | 422} statusCode
 * @param {string} message
 * @returns {RegisterFailure}
 */
function registerFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}
