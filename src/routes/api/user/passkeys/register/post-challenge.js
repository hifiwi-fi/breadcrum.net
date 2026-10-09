import { server } from '@passwordless-id/webauthn/dist/esm/index.js'
import { storeChallenge } from '../challenge-store.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function registrationChallenge (fastify, _opts) {
  fastify.post(
    '/challenge',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['passkeys'],
        summary: 'Generate registration challenge',
        description: 'Generate a random challenge for WebAuthn passkey registration. Challenge is valid for 5 minutes.',
        response: {
          200: {
            type: 'object',
            required: ['challenge'],
            properties: {
              challenge: {
                type: 'string',
                description: 'Random challenge string to be used in client.register()',
              },
            },
          },
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function registrationChallengeHandler (request, reply) {
      const userId = request.user.id

      // Generate cryptographically secure challenge
      const challenge = server.randomChallenge()

      // Registration challenges are authenticated and always tied to a userId.
      // Authentication challenges can be public and may omit userId (conditional mediation).
      await storeChallenge(fastify, challenge, {
        userId,
        type: 'register',
        createdAt: Date.now(),
      })

      return reply.code(200).send({ challenge })
    }
  )
}
