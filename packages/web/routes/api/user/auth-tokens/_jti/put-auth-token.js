import { schemaAuthTokenRead } from '../schemas/schema-auth-token-read.js'
import { schemaAuthTokenUpdate } from '../schemas/schema-auth-token-update.js'
import { updateAuthToken } from '../auth-token-actions.js'

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
export async function putAuthToken (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['auth-tokens'],
        summary: 'Update an auth token',
        description: 'Update the note field and/or protect status of a specific auth token (session) for the authenticated user',
        params: {
          type: 'object',
          properties: {
            jti: {
              type: 'string',
              format: 'uuid',
              description: 'The JWT ID of the token to update',
            },
          },
          required: ['jti'],
        },
        body: schemaAuthTokenUpdate,
        response: {
          200: schemaAuthTokenRead,
          400: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
    },
    async function putAuthTokenHandler (request, reply) {
      const { id: userId, jti: currentJti } = request.user
      const { jti } = request.params
      const { note, protect } = request.body

      const result = await updateAuthToken(fastify, {
        userId,
        currentJti,
        jti,
        note,
        protect,
      })

      if (!result.ok) {
        return reply.notFound('Auth token not found')
      }

      return reply.code(200).send(result.authToken)
    }
  )
}
