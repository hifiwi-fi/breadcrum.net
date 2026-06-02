/**
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 * @import { EmailConfirmResult } from './verify-email-action.js'
 */
import SQL from '@nearform/sql'

/**
 * @typedef {object} AccountEmailConfirmUser
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {string | null} email_verify_token
 * @property {Date | null} email_verify_token_exp
 */

/**
 * @param  {object} params
 * @param  {string} params.userId
 * @param  {PgClient} params.client
 * @param  {string} params.token
 * @param  {Date} params.now
 * @returns {Promise<EmailConfirmResult>}
 */
export async function verifyEmailConfirmHandler ({
  userId, client, token, now,
}) {
  const verifyQuery = SQL`
    select id, email, username, email_confirmed, email_verify_token, email_verify_token_exp
    from users
    where id = ${userId}
    fetch first row only;
  `

  /** @type {QueryResult<AccountEmailConfirmUser>} */
  const results = await client.query(verifyQuery)
  const user = results.rows[0]

  if (!user) {
    return emailConfirmFailure(403, 'Invalid email confirmation token, or a token for another user account.')
  }

  if (user.email_confirmed) {
    return emailConfirmFailure(422, 'Email is already confirmed')
  }

  if (user.email_verify_token !== token || user.email_verify_token === null) {
    return emailConfirmFailure(403, 'Invalid email confirmation token, or a token for another user account.')
  }

  if (!user.email_verify_token_exp || now > user.email_verify_token_exp) {
    return emailConfirmFailure(403, 'Expired email confirmation token')
  }

  const updates = [
    SQL`email_confirmed = true`,
    SQL`email_verify_token = null`,
    SQL`email_verify_token_exp = null`,
    SQL`pending_email_update = null`,
    SQL`pending_email_update_token = null`,
    SQL`pending_email_update_token_exp = null`,
  ]

  const confirmQuery = SQL`
    update users
    set ${SQL.glue(updates, ' , ')}
    where id = ${userId}
  `

  await client.query(confirmQuery)

  return {
    ok: true,
    email: user.email,
    confirmed: true,
  }
}

/**
 * @param {403 | 422} statusCode
 * @param {string} message
 * @returns {EmailConfirmResult}
 */
function emailConfirmFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}
