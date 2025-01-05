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
 *  confirmed: boolean
 * }>}
 */
export async function verifyEmailConfirmHandler ({
  userId, client, token, reply, now,
}) {
  const verifyQuery = SQL`
    select id, email, username, email_confirmed, email_verify_token, email_verify_token_exp
    from users
    where id = ${userId}
    fetch first row only;
  `

  const results = await client.query(verifyQuery)
  const user = results.rows.pop()

  if (user.email_confirmed) {
    return reply.unprocessableEntity('Email is already confirmed')
  }

  if (user.email_verify_token !== token ||
        user.email_verify_token === null) {
    return reply.forbidden('Invalid email confirmation token, or a token for another user account.')
  }

  if (now > user.email_verify_token_exp) {
    return reply.forbidden('Expired email confirmation token')
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

  reply.code(202)
  return {
    status: 'ok',
    email: user.email,
    confirmed: true,
  }
}
