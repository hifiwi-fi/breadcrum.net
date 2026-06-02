import { confirmEmail } from './verify-email-action.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * Verify an email address or a pending email address
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function verifyEmailRoute (fastify, _opts) {
  fastify.post(
    '::verify',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['user'],
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            token: {
              type: 'string',
              minLength: 64,
              maxLength: 64,
            },
            update: {
              type: 'boolean',
            },
          },
          required: ['token', 'update'],
        },
        response: {
          202: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: {
                type: 'string',
              },
              email: {
                type: 'string',
                format: 'email',
              },
              updated: {
                type: 'boolean',
              },
              confirmed: {
                type: 'boolean',
              },
            },
          },
        },
      },
    },
    async function verifyEmailHandler (request, reply) {
      const result = await confirmEmail(fastify, {
        userId: request.user.id,
        token: request.body.token,
        update: request.body.update,
      })

      if (!result.ok) {
        if (result.statusCode === 422) {
          return reply.unprocessableEntity(result.message)
        }

        return reply.forbidden(result.message)
      }

      reply.code(202)
      const response = {
        status: 'ok',
        email: result.email,
        confirmed: result.confirmed,
      }

      return result.updated
        ? { ...response, updated: true }
        : response
    }
  )
}
