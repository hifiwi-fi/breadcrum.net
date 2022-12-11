/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { EMAIL_CONFIRM_TOKEN, EMAIL_CONFIRM_TOKEN_EXP } from './email-confirm-tokens.js'

export async function resendAccountEmailVerificationHandler ({
  userID, client, reply, fastify
}) {
  const verifyQuery = SQL`
          select id, email, username, email_confirmed, email_verify_token, email_verify_token_exp
          from users
          where id = ${userID}
          fetch first row only;
        `

  const results = await client.query(verifyQuery)
  const user = results.rows.pop()

  if (user.email_confirmed) {
    return reply.unprocessableEntity('Email is already confirmed')
  }

  const updates = [
    SQL`email_verify_token = ${EMAIL_CONFIRM_TOKEN}`,
    SQL`email_verify_token_exp = ${EMAIL_CONFIRM_TOKEN_EXP}`
  ]

  const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userID}
          returning username, email, email_verify_token, email_verify_token_exp;
        `

  const queryResults = await client.query(updateQuery)
  const updatedUser = queryResults.rows.pop()

  fastify.pqueue.add(async () => {
    const blackholeResults = await fastify.pg.query(SQL`
            select email, bounce_count, disabled
            from email_blackhole
            where email = ${updatedUser.email}
            fetch first row only;
          `)

    if (blackholeResults.rows.length === 0 || blackholeResults.rows[0].disabled === false) {
      return await Promise.allSettled([
        fastify.email.sendMail({
          from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
          to: updatedUser.email,
          subject: 'Verify your email address', // Subject line
          text: verifyEmailBody({
            username: updatedUser.username,
            transport: fastify.config.TRANSPORT,
            host: fastify.config.HOST,
            token: updatedUser.email_verify_token,
            oldEmail: updatedUser.email,
            newEmail: updatedUser.pending_email_update
          })
        })
      ])
    } else {
      fastify.log.warn({ email: updatedUser.email }, 'Skipping email for blocked email address')
    }
  })

  reply.code(202)
  return {
    status: 'ok'
  }
}

export function verifyEmailBody ({ email, username, transport, host, token }) {
  return `Hi ${username},

Thanks for signing up for a Breadcrum.net account. Please verify your email address by clicking the link below.

${transport}://${host}/email_confirm?token=${token}

If you did not sign up for this account, please contact support@breadcrum.net or perform a password reset on the account associated with this email address and perform an account delete action if this is unwanted.

Thank you!`
}
