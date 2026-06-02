import { schemaPasskeyRead } from '../schemas/schema-passkey-read.js'
import { updatePasskeyName } from '../passkey-actions.js'

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
export async function updatePasskey (fastify, _opts) {
  fastify.patch(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['passkeys'],
        summary: 'Update a passkey',
        description: 'Update the name of a specific passkey for the authenticated user',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The passkey ID to update',
            },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'New name for the passkey',
            },
          },
        },
        response: {
          200: schemaPasskeyRead,
          400: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
    },
    async function updatePasskeyHandler (request, reply) {
      const userId = request.user.id
      const { id } = request.params
      const { name } = request.body

      const result = await updatePasskeyName(fastify, {
        userId,
        id,
        name,
      })

      if (!result.ok) {
        return reply.notFound(result.message)
      }

      return reply.code(200).send(result.passkey)
    }
  )
}
