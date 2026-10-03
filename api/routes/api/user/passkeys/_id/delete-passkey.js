import SQL from '@nearform/sql'

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

      const query = SQL`
        delete from passkeys
        where id = ${id}
          and user_id = ${userId}
      `

      const result = await fastify.pg.query(query)

      if (result.rowCount === 0) {
        return reply.notFound('Passkey not found')
      }

      return reply.code(204).send(null)
    }
  )
}
