/**
 * @import { FastifyInstance, FastifyReply } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */
import SQL from '@nearform/sql'
import { EMAIL_CONFIRM_TOKEN, EMAIL_CONFIRM_TOKEN_EXP } from './email-confirm-tokens.js'

/**
 * @param  {object} params
 * @param  {string} params.userId
 * @param  {PgClient} params.client
 * @param  {FastifyReply} params.reply  [description]
 * @param  {FastifyInstance} params.fastify
 */
export async function resendAccountEmailVerificationHandler ({
  userId, client, reply, fastify,
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

  const updates = [
    SQL`email_verify_token = ${EMAIL_CONFIRM_TOKEN}`,
    SQL`email_verify_token_exp = ${EMAIL_CONFIRM_TOKEN_EXP}`,
  ]

  const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userId}
          returning username, email, email_verify_token, email_verify_token_exp;
        `

  const queryResults = await client.query(updateQuery)
  const updatedUser = queryResults.rows.pop()

  const emailSendJob = fastify.sendEmail({
    toEmail: updatedUser.email,
    subject: 'Verify your email address',
    text: verifyEmailBody({
      username: updatedUser.username,
      transport: fastify.config.TRANSPORT,
      host: fastify.config.HOST,
      token: updatedUser.email_verify_token,
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

/**
 * @param  {object} params Params for the email body
 * @param  {string} params.username
 * @param  { 'http' | 'https' } params.transport``
 * @param  {string} params.host
 * @param  {string} params.token
 * @returns { string } The body of the email
 */
export function verifyEmailBody ({ username, transport, host, token }) {
  return `Hi ${username},

Thanks for signing up for a Breadcrum.net account. Please verify your email address by clicking the link below.

${transport}://${host}/email_confirm?token=${token}

Thank you!`
}
