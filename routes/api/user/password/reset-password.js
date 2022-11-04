/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { PASSWORD_RESET_EXP, PASSWORD_RESET_TOKEN } from './password-reset-token.js'

export async function resetPassword (fastify, opts) {
  fastify.post(
    '::reset',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email'
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
    async function verifyEmailHandler (request, reply) {
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

        fastify.pqueue.add(async () => {
          return await fastify.email.sendMail({
            from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
            to: user.email,
            subject: 'Your password has been updated', // Subject line
            text: passwordResetBody({
              token: password_reset_token,
              userID: user.id,
              username: user.username,
              host: fastify.config.HOST,
              transport: fastify.config.TRANSPORT
            })
          })
        })

        reply.code(202)

        return {
          status: 'ok'
        }
      })
    }
  )
}

function passwordResetBody ({ userID, username, host, transport, token }) {
  return `Hi ${username},

Someone requested a password reset for your account. If you requested this reset, visit the following URL and update your password.

${transport}://${host}/password_reset/confirm?token=${token}&user_id=${userID}

If you did not request this change, delete this email. If you have furthur issues contact support@breadcrum.net.

Thank you!`
}
