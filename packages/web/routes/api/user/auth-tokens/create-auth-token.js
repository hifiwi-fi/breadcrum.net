import { schemaAuthTokenCreate } from './schemas/schema-auth-token-create.js'
import { schemaAuthTokenCreateResponse } from './schemas/schema-auth-token-create-response.js'
import { createAuthTokenForReply } from './auth-token-actions.js'

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
export async function createAuthToken (fastify, _opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: {
        tags: ['auth-tokens'],
        summary: 'Create a new auth token',
        description: 'Create a new auth token (session) for the authenticated user with optional note and protect status',
        body: schemaAuthTokenCreate,
        response: {
          201: schemaAuthTokenCreateResponse
        },
      },
    },
    async function createAuthTokenHandler (request, reply) {
      const { id: userId, username, jti: currentJti } = request.user
      const { note, protect } = request.body

      const result = await createAuthTokenForReply(fastify, reply, {
        userId,
        username,
        currentJti,
        note,
        protect,
      })

      return reply.code(201).send(result)
    }
  )
}
