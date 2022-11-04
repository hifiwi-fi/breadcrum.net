/* eslint-disable camelcase */
import SQL from '@nearform/sql'

export async function postPassword (fastify, opts) {
  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 50
            },
            token: {
              type: 'string',
              minLength: 64,
              maxLength: 64
            },
            userID: {
              type: 'string',
              format: 'uuid'
            }
          },
          required: ['password', 'token']
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
    async function postEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const now = new Date()
        const { password, userID, token } = request.body

        const resetVerifyQuery = SQL`
          select id, email, username, email_confirmed, password_reset_token, password_reset_token_exp
          from users
          where id = ${userID}
          fetch first row only;
        `

        const results = await client.query(resetVerifyQuery)
        const user = results.rows.pop()

        if (
          user.password_reset_token !== token ||
          user.password_reset_token === null
        ) {
          return reply.forbidden('Invalid password reset token')
        }

        if (now > user.password_reset_token_exp) {
          return reply.forbidden('Expired password reset token')
        }

        const updates = [
          SQL`password = crypt(${password}, gen_salt('bf'))`,
          SQL`password_reset_token = null`,
          SQL`password_reset_token_exp = null`
        ]

        const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userID};
        `

        await client.query(updateQuery)

        fastify.pqueue.add(async () => {
          return await fastify.email.sendMail({
            from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
            to: user.email,
            subject: 'Your password has been updated', // Subject line
            text: passwordUpdatedBody({
              username: user.username,
              host: fastify.config.HOST
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

function passwordUpdatedBody ({ username, host, token }) {
  return `Hi ${username},

Your password on Breadcrum.net has been updated.

If you did not request this change, please immediately reset your password and contact support@breadcrum.net and ensure no unauthorized access to your email address has occured.

Thank you!`
}
