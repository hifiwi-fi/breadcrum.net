/**
 * @import { FastifyReply } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */
import SQL from '@nearform/sql'

/**
 * @param  {object} params
 * @param  {string} params.userId
 * @param  {PgClient} params.client
 * @param  {FastifyReply} params.reply  [description]
 * @param  {string} params.token
 * @param  {Date} params.now
 * @returns {Promise<{
 *  status: 'ok'
 *  email: string
 *  updated: true
 *  confirmed: boolean
 * }>}
 */
export async function verifyEmailUpdateHandler ({
  userId, client, reply, token, now,
}) {
  const updateVerifyQuery = SQL`
    select id, email, username, email_confirmed, pending_email_update, pending_email_update_token, pending_email_update_token_exp
    from users
    where id = ${userId}
    fetch first row only;
  `

  const results = await client.query(updateVerifyQuery)
  const user = results.rows.pop()

  if (!user.pending_email_update || !user.pending_email_update_token || !user.pending_email_update_token_exp) {
    return reply.unprocessableEntity('There is no pending email update')
  }

  if (user.pending_email_update_token !== token ||
        user.pending_email_update_token === null) {
    return reply.forbidden('Invalid email confirmation token, or a token for another user account')
  }

  if (now > user.pending_email_update_token_exp) {
    return reply.forbidden('Expired email update confirmation token')
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
    return reply.forbidden('An account already exists with the new email address')
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

  const queryResults = await client.query(updateQuery)
  const updatedUser = queryResults.rows.pop()

  reply.code(202)

  return {
    status: 'ok',
    email: updatedUser.email,
    updated: true,
    confirmed: updatedUser.email_confirmed,
  }
}
