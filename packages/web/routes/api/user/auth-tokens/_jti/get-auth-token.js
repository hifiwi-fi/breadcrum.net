import { schemaAuthTokenRead } from '../schemas/schema-auth-token-read.js'
import { getSingleAuthToken } from './get-single-auth-token-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function getAuthToken (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['auth-tokens'],
        summary: 'Get a specific auth token',
        description: 'Get details of a specific auth token (session) for the authenticated user',
        params: {
          type: 'object',
          properties: {
            jti: {
              type: 'string',
              format: 'uuid',
              description: 'The JWT ID of the token to retrieve',
            },
          },
          required: ['jti'],
        },
        response: {
          200: schemaAuthTokenRead,
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async function getAuthTokenHandler (request, reply) {
      const { id: userId, jti: currentJti } = request.user
      const { jti } = request.params

      const token = await getSingleAuthToken({
        fastify,
        userId,
        jti,
        currentJti,
      })

      if (!token) {
        return reply.notFound('Auth token not found')
      }

      return token
    }
  )
}
