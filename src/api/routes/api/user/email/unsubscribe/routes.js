import SQL from '@nearform/sql'
import { userEditableUserProps } from '../../schemas/user-base.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * Unsubscribe an email address no matter what
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function unsubscribeEmailRoute (fastify, _opts) {
  fastify.route({
    url: '/',
    method: [
      'POST',
      'GET',
    ],
    schema: {
      tags: ['user'],
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          email: userEditableUserProps.properties.email,
        },
        required: ['email'],
      },
      response: {
        202: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: {
              type: 'string', enum: ['ok']
            },
          },
        },
      },
    },
    handler: async function unsubscribeEmailHandler (request, _reply) {
      return fastify.pg.transact(async client => {
        const { email } = request.query

        const query = SQL`
        update users
        set newsletter_subscription = false
        where email = ${email}
        `

        await client.query(query)

        // TODO: log rows unsubscribing

        return /** @type {const} */({
          status: 'ok',
        })
      })
    },
  })
}
