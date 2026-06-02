import { userEditableUserProps } from '../../schemas/user-base.js'
import { unsubscribeEmail } from './unsubscribe-action.js'

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
    handler: async function unsubscribeEmailHandler (request, reply) {
      await unsubscribeEmail(fastify, request.query.email)
      reply.code(202)

      return /** @type {const} */({
        status: 'ok',
      })
    },
  })
}
