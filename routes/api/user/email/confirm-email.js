/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { EMAIL_CONFIRM_TOKEN, EMAIL_CONFIRM_TOKEN_EXP } from './email-confirm-tokens.js'

export async function confirmEmail (fastify, opts) {
  fastify.post(
    '::confirm',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {},
      respose: {
        202: {
          type: 'object',
          properties: {
            status: {
              type: 'string'
            }
          }
        }
      }
    },
    async function confirmEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userID = request.user.id
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
          return await Promise.all([
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
        })

        reply.code(202)
        return {
          status: 'ok'
        }
      })
    }
  )
}

function verifyEmailBody ({ email, username, transport, host, token }) {
  return `Hi ${username},

Thanks for signing up for a Breadcrum.net account. Please verify your email address by clicking the link below.

${transport}://${host}/email_confirm?token=${token}&update=${false}

If you did not sign up for this account, please contact support@breadcrum.net or perform a password reset on the account associated with this email address and perform an account delete action if this is unwanted.

Thank you!`
}
