import { server } from '@passwordless-id/webauthn'
import { storeChallenge } from '../challenge-store.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function getAuthenticationChallenge (fastify, _opts) {
  fastify.get(
    '/challenge',
    {
      config: {
        rateLimit: {
          max: 50,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['passkeys'],
        summary: 'Get authentication challenge (conditional mediation)',
        description: 'Generate a challenge for conditional mediation (auto-prompt). No user identification required.',
        response: {
          200: {
            type: 'object',
            required: ['challenge'],
            properties: {
              challenge: {
                type: 'string',
                description: 'Random challenge for authentication',
              },
            },
          },
        },
      },
    },
    async function getAuthenticationChallengeHandler (_request, reply) {
      // Generate challenge
      const challenge = server.randomChallenge()

      // Authentication challenges can be public and may omit userId (conditional mediation).
      // Registration challenges are authenticated and always tied to a userId.
      await storeChallenge(fastify, challenge, {
        type: 'authenticate',
        createdAt: Date.now(),
      })

      return reply.code(200).send({
        challenge,
      })
    }
  )
}
