import { schemaAuthTokenCreate } from './schemas/schema-auth-token-create.js'
import { schemaAuthTokenCreateResponse } from './schemas/schema-auth-token-create-response.js'
import { getSingleAuthToken } from './_jti/get-single-auth-token-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { JwtUserWithTokenId } from '../../../../plugins/jwt.js'
 * @import { TypeAuthTokenRead } from './schemas/schema-auth-token-read.js'
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
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['auth-tokens'],
        summary: 'Create a new auth token',
        description: 'Create a new auth token (session) for the authenticated user with optional note and protect status',
        body: schemaAuthTokenCreate,
        response: {
          201: schemaAuthTokenCreateResponse,
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function createAuthTokenHandler (request, reply) {
      const { id: userId, username, jti: currentJti } = request.user
      const { note, protect } = request.body

      // Create the JWT token using the decorated function with note and protect
      const token = await reply.createJWTToken({
        id: userId,
        username,
        note,
        protect
      }, 'api')

      // Decode the token to get the jti
      /** @type {JwtUserWithTokenId | null} */
      const decodedToken = fastify.jwt.decode(token)
      if (!decodedToken) {
        throw new Error('Failed to decode JWT token')
      }
      const newJti = decodedToken.jti

      // Get the full auth token details
      /** @type {TypeAuthTokenRead | undefined} */
      const authToken = await getSingleAuthToken({
        fastify,
        userId,
        jti: newJti,
        currentJti,
      })

      if (!authToken) {
        throw new Error('Failed to retrieve created auth token')
      }

      return reply.code(201).send({
        token,
        auth_token: authToken,
      })
    }
  )
}
