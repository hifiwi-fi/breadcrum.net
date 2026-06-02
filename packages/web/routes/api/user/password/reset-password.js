import { userEditableUserProps } from '../schemas/user-base.js'
import { requestPasswordReset } from './password-reset-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function resetPasswordRoute (fastify, _opts) {
  fastify.post(
    '::reset',
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
    },
    async function resetPasswordHandler (request, reply) {
      const result = await requestPasswordReset(fastify, request.body.email)
      if (!result.ok) return reply.notFound(result.message)

      reply.code(202)
      return /** @type {const} */ ({
        status: 'ok',
      })
    }
  )
}
