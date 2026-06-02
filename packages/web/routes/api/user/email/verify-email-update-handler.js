/**
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 * @import { EmailConfirmResult } from './verify-email-action.js'
 */
import SQL from '@nearform/sql'

/**
 * @typedef {object} PendingEmailUpdateUser
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {string | null} pending_email_update
 * @property {string | null} pending_email_update_token
 * @property {Date | null} pending_email_update_token_exp
 */

/**
 * @param  {object} params
 * @param  {string} params.userId
 * @param  {PgClient} params.client
 * @param  {string} params.token
 * @param  {Date} params.now
 * @returns {Promise<EmailConfirmResult>}
 */
export async function verifyEmailUpdateHandler ({
  userId, client, token, now,
}) {
  const updateVerifyQuery = SQL`
    select id, email, username, email_confirmed, pending_email_update, pending_email_update_token, pending_email_update_token_exp
    from users
    where id = ${userId}
    fetch first row only;
  `

  /** @type {QueryResult<PendingEmailUpdateUser>} */
  const results = await client.query(updateVerifyQuery)
  const user = results.rows[0]

  if (!user) {
    return emailConfirmFailure(403, 'Invalid email confirmation token, or a token for another user account')
  }

  if (!user.pending_email_update || !user.pending_email_update_token || !user.pending_email_update_token_exp) {
    return emailConfirmFailure(422, 'There is no pending email update')
  }

  if (user.pending_email_update_token !== token || user.pending_email_update_token === null) {
    return emailConfirmFailure(403, 'Invalid email confirmation token, or a token for another user account')
  }

  if (now > user.pending_email_update_token_exp) {
    return emailConfirmFailure(403, 'Expired email update confirmation token')
  }

  const existingUserEmailQuery = SQL`
    select id, email
    from users
    where email = ${user.pending_email_update}
    fetch first row only;
  `

  const existingUserEmailResults = await client.query(existingUserEmailQuery)
  const hasExistingUserEmail = existingUserEmailResults.rows.length > 0

  if (hasExistingUserEmail) {
    return emailConfirmFailure(403, 'An account already exists with the new email address')
  }

  const updates = [
    SQL`email = ${user.pending_email_update}`,
    SQL`email_confirmed = true`,
    SQL`email_verify_token = null`,
    SQL`email_verify_token_exp = null`,
    SQL`pending_email_update = null`,
    SQL`pending_email_update_token = null`,
    SQL`pending_email_update_token_exp = null`,
  ]

  const updateQuery = SQL`
    update users
    set ${SQL.glue(updates, ' , ')}
    where id = ${userId}
    returning email, email_confirmed;
  `

  /** @type {QueryResult<{ email: string, email_confirmed: boolean }>} */
  const queryResults = await client.query(updateQuery)
  const updatedUser = queryResults.rows[0]

  if (!updatedUser) {
    return emailConfirmFailure(422, 'Email update failed')
  }

  return {
    ok: true,
    email: updatedUser.email,
    updated: true,
    confirmed: updatedUser.email_confirmed,
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
