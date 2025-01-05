/**
 * @import { FastifyInstance, FastifyReply } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

import SQL from '@nearform/sql'
import { EMAIL_CONFIRM_TOKEN, EMAIL_CONFIRM_TOKEN_EXP } from './email-confirm-tokens.js'
import { verifyEmailSubject, verifyEmailUpdateBody } from './post-email.js'

/**
 * @param  {object} params
 * @param  {string} params.userId
 * @param  {PgClient} params.client
 * @param  {FastifyReply} params.reply  [description]
 * @param  {FastifyInstance} params.fastify
 */
export async function resendPendingEmailVerificationHandler ({
  userId, client, reply, fastify,
}) {
  const verifyQuery = SQL`
          select id, email, username, pending_email_update, pending_email_update_token, pending_email_update_token_exp
          from users
          where id = ${userId}
          fetch first row only;
        `

  const results = await client.query(verifyQuery)
  const user = results.rows.pop()

  if (!user.pending_email_update) {
    return reply.unprocessableEntity('No email updates pending')
  }

  const updates = [
    SQL`pending_email_update_token = ${EMAIL_CONFIRM_TOKEN}`,
    SQL`pending_email_update_token_exp = ${EMAIL_CONFIRM_TOKEN_EXP}`,
  ]

  const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userId}
          returning username, email, pending_email_update, pending_email_update_token, pending_email_update_token_exp;
        `

  const queryResults = await client.query(updateQuery)
  const updatedUser = queryResults.rows.pop()

  const emailSendJob = fastify.sendEmail({
    toEmail: updatedUser.pending_email_update,
    subject: verifyEmailSubject,
    text: verifyEmailUpdateBody({
      username: updatedUser.username,
      transport: fastify.config.TRANSPORT,
      host: fastify.config.HOST,
      token: updatedUser.pending_email_update_token,
      oldEmail: updatedUser.email,
      newEmail: updatedUser.pending_email_update,
    }),
  })

  await client.query('commit')
  reply.code(202)
  reply.send({
    status: 'ok',
  })

  await reply
  // Request finished

  await emailSendJob
}
