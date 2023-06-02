/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { PASSWORD_RESET_EXP, PASSWORD_RESET_TOKEN } from './password-reset-token.js'
import { validatedUserProps } from '../user-props.js'

export async function resetPassword (fastify, opts) {
  fastify.post(
    '::reset',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      schema: {
        body: {
          type: 'object',
          properties: {
            email: {
              ...validatedUserProps.email
            }
          },
          required: ['email']
        }
      },
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
    async function resetPasswordHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const { email } = request.body

        const resetPasswordUser = SQL`
          select id, email, username, email_confirmed, password_reset_token, password_reset_token_exp
          from users
          where email = ${email}
          fetch first row only;
        `

        const results = await client.query(resetPasswordUser)
        const user = results.rows.pop()

        if (!user) {
          return reply.notFound('No user with that email address found')
        }

        const updates = [
          SQL`password_reset_token = ${PASSWORD_RESET_TOKEN}`,
          SQL`password_reset_token_exp = ${PASSWORD_RESET_EXP}`
        ]

        const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${user.id}
          returning password_reset_token, password_reset_token_exp;
        `

        const resetTokenResults = await client.query(updateQuery)
        const { password_reset_token } = resetTokenResults.rows.pop()

        const emailSendJob = fastify.sendEmail({
          toEmail: user.email,
          subject: 'Password reset request',
          text: passwordResetBody({
            token: password_reset_token,
            userId: user.id,
            username: user.username,
            host: fastify.config.HOST,
            transport: fastify.config.TRANSPORT,
            email: user.email
          })
        })

        await client.query('commit')
        reply.code(202)
        reply.send({
          status: 'ok'
        })
        await reply
        // Request finished

        await emailSendJob
      })
    }
  )
}

function passwordResetBody ({ userId, username, host, transport, token, email }) {
  return `Hi ${username},

Someone requested a password reset for your account. If you requested this reset, visit the following URL and update your password.

${transport}://${host}/password_reset/confirm?token=${token}&user_id=${userId}

If you did not request this change, delete this email. If you have furthur issues contact support@breadcrum.net.

Thank you!`
}
