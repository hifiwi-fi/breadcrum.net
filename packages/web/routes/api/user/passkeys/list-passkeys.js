import { schemaPasskeyRead } from './schemas/schema-passkey-read.js'
import { listPasskeysForUser } from './passkey-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function listPasskeys (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['passkeys'],
        summary: 'List passkeys for the current user',
        description: 'Get a list of all registered passkeys for the authenticated user (max 10, no pagination)',
        response: {
          200: {
            type: 'array',
            items: schemaPasskeyRead,
          },
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function listPasskeysHandler (request, reply) {
      const userId = request.user.id
      const passkeys = await listPasskeysForUser(fastify, { userId })

      return reply.code(200).send(passkeys)
    }
  )
}
