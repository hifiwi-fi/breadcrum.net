import { userEditableUserProps } from '../schemas/user-base.js'
import { confirmPasswordReset } from './password-reset-actions.js'

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
          required: ['password', 'token', 'userId'],
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
      const result = await confirmPasswordReset(fastify, request.body)
      if (!result.ok) return reply.forbidden(result.message)

      reply.code(202)
      return /** @type {const} */ ({
        status: 'ok',
      })
    }
  )
}
