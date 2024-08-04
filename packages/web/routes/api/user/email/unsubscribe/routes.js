import SQL from '@nearform/sql'
import { userEditableUserProps } from '../../user-props.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * Unsubscribe an email address no matter what
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function unsubscribeEmailRoute (fastify, opts) {
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
        properties: {
          email: userEditableUserProps.email,
        },
        required: ['email'],
      },
      respose: {
        202: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
            },
          },
        },
      },
    },
    handler: async function unsubscribeEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const { email } = request.query

        const query = SQL`
        update users
        set newsletter_subscription = false
        where email = ${email}
        `

        await client.query(query)

        // TODO: log rows unsubscribing

        return {
          status: 'ok',
        }
      })
    },
  })
}
