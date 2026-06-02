import { deletePasskeyById } from '../passkey-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function deletePasskey (fastify, _opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['passkeys'],
        summary: 'Delete a passkey',
        description: 'Delete (revoke) a specific passkey for the authenticated user',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The passkey ID to delete',
            },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Passkey successfully deleted',
          },
          400: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
    },
    async function deletePasskeyHandler (request, reply) {
      const userId = request.user.id
      const { id } = request.params

      const result = await deletePasskeyById(fastify, {
        userId,
        id,
      })

      if (!result.ok) {
        return reply.notFound(result.message)
      }

      return reply.code(204).send(null)
    }
  )
}
