import SQL from '@nearform/sql'
import { getPasswordHashQuery } from './password-hash.js'
import { userEditableUserProps } from '../schemas/user-base.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function postPasswordRoute (fastify, _opts) {
  fastify.post(
    '/',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['user'],
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            password: userEditableUserProps.properties.password,
            token: {
              type: 'string',
              minLength: 64,
              maxLength: 64,
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['password', 'token'],
        },
        response: {
          202: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['ok']
              },
            },
          },
        },
      },
    },
    async function postEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const now = new Date()
        const { password, userId, token } = request.body

        const resetVerifyQuery = SQL`
          select id, email, username, email_confirmed, password_reset_token, password_reset_token_exp
          from users
          where id = ${userId}
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
          SQL`password = ${getPasswordHashQuery(password)}`,
          SQL`password_reset_token = null`,
          SQL`password_reset_token_exp = null`,
        ]

        const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userId};
        `

        await client.query(updateQuery)

        const emailSendJob = fastify.sendEmail({
          toEmail: user.email,
          subject: 'Your password has been updated',
          text: passwordUpdatedBody({
            username: user.username,
            host: fastify.config.HOST,
            transport: fastify.config.TRANSPORT,
            email: user.email,
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
      })
    }
  )
}

/**
 * @param  {object} params
 * @param  {string} params.username
 * @param  {string} params.host
 * @param  {'http' | 'https'} params.transport
 * @param  {string} params.email
 * @return {string}
 */
function passwordUpdatedBody ({ username }) {
  return `Hi ${username},

Your password on Breadcrum.net has been updated.

If you did not request this change, please immediately reset your password and contact support@breadcrum.net and ensure no unauthorized access to your email address has occured.

Thank you!`
}
