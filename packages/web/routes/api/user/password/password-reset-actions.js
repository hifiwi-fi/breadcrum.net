import SQL from '@nearform/sql'
import { getPasswordHashQuery } from './password-hash.js'
import { PASSWORD_RESET_EXP, PASSWORD_RESET_TOKEN } from './password-reset-token.js'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { QueryResult } from 'pg'
 */

/**
 * @typedef {object} PasswordResetUser
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {string | null} password_reset_token
 * @property {Date | null} password_reset_token_exp
 */

/**
 * @typedef {{ ok: true }} PasswordResetSuccess
 */

/**
 * @typedef {{ ok: false, statusCode: 403 | 404, message: string }} PasswordResetFailure
 */

/**
 * @typedef {PasswordResetSuccess | PasswordResetFailure} PasswordResetResult
 */

/**
 * @param {FastifyInstance} fastify
 * @param {string} email
 * @returns {Promise<PasswordResetResult>}
 */
export async function requestPasswordReset (fastify, email) {
  /** @type {Promise<unknown>} */
  let emailSendJob = Promise.resolve()

  const result = await fastify.pg.transact(async client => {
    const resetPasswordUser = SQL`
      select id, email, username, email_confirmed, password_reset_token, password_reset_token_exp
      from users
      where email = ${email}
      fetch first row only;
    `

    /** @type {QueryResult<PasswordResetUser>} */
    const results = await client.query(resetPasswordUser)
    const user = results.rows[0]

    if (!user) {
      return passwordResetFailure(404, 'No user with that email address found')
    }

    const updateQuery = SQL`
      update users
      set ${SQL.glue([
        SQL`password_reset_token = ${PASSWORD_RESET_TOKEN}`,
        SQL`password_reset_token_exp = ${PASSWORD_RESET_EXP}`,
      ], ' , ')}
      where id = ${user.id}
      returning password_reset_token, password_reset_token_exp;
    `

    /** @type {QueryResult<{ password_reset_token: string }>} */
    const resetTokenResults = await client.query(updateQuery)
    const resetToken = resetTokenResults.rows[0]?.password_reset_token

    if (!resetToken) {
      return passwordResetFailure(404, 'Password reset token could not be created')
    }

    emailSendJob = fastify.sendEmail({
      toEmail: user.email,
      subject: 'Password reset request',
      text: passwordResetBody({
        token: resetToken,
        userId: user.id,
        username: user.username,
        host: fastify.config.HOST,
        transport: fastify.config.TRANSPORT,
        email: user.email,
      }),
    })

    return passwordResetSuccess()
  })

  if (result.ok) await emailSendJob
  return result
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.token
 * @param {string} params.password
 * @returns {Promise<PasswordResetResult>}
 */
export async function confirmPasswordReset (fastify, { userId, token, password }) {
  /** @type {Promise<unknown>} */
  let emailSendJob = Promise.resolve()

  const result = await fastify.pg.transact(async client => {
    const now = new Date()
    const resetVerifyQuery = SQL`
      select id, email, username, email_confirmed, password_reset_token, password_reset_token_exp
      from users
      where id = ${userId}
      fetch first row only;
    `

    /** @type {QueryResult<PasswordResetUser>} */
    const results = await client.query(resetVerifyQuery)
    const user = results.rows[0]

    if (!user || user.password_reset_token !== token || user.password_reset_token === null) {
      return passwordResetFailure(403, 'Invalid password reset token')
    }

    if (!user.password_reset_token_exp || now > user.password_reset_token_exp) {
      return passwordResetFailure(403, 'Expired password reset token')
    }

    const updateQuery = SQL`
      update users
      set ${SQL.glue([
        SQL`password = ${getPasswordHashQuery(password)}`,
        SQL`password_reset_token = null`,
        SQL`password_reset_token_exp = null`,
      ], ' , ')}
      where id = ${userId};
    `

    await client.query(updateQuery)

    emailSendJob = fastify.sendEmail({
      toEmail: user.email,
      subject: 'Your password has been updated',
      text: passwordUpdatedBody({
        username: user.username,
        host: fastify.config.HOST,
        transport: fastify.config.TRANSPORT,
        email: user.email,
      }),
    })

    return passwordResetSuccess()
  })

  if (result.ok) await emailSendJob
  return result
}

/**
 * @param {403 | 404} statusCode
 * @param {string} message
 * @returns {PasswordResetFailure}
 */
function passwordResetFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}

/**
 * @returns {PasswordResetSuccess}
 */
function passwordResetSuccess () {
  return {
    ok: true,
  }
}

/**
 * @param  {object} params
 * @param  {string} params.userId
 * @param  {string} params.username
 * @param  {string} params.host
 * @param  {'http' | 'https'} params.transport
 * @param  {string} params.token
 * @param  {string} params.email
 * @return {string}
 */
function passwordResetBody ({ userId, username, host, transport, token, email: _email }) {
  return `Hi ${username},

Someone requested a password reset for your account. If you requested this reset, visit the following URL and update your password.

${transport}://${host}/password_reset/confirm?token=${token}&user_id=${userId}

If you did not request this change, delete this email. If you have furthur issues contact support@breadcrum.net.

Thank you!`
}

/**
 * @param  {object} params
 * @param  {string} params.username
 * @param  {string} params.host
 * @param  {'http' | 'https'} params.transport
 * @param  {string} params.email
 * @return {string}
 */
function passwordUpdatedBody ({ username }) {
  return `Hi ${username},

Your password on Breadcrum.net has been updated.

If you did not request this change, please immediately reset your password and contact support@breadcrum.net and ensure no unauthorized access to your email address has occured.

Thank you!`
}
