import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function deleteAuthToken (fastify, _opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['auth-tokens'],
        summary: 'Delete an auth token',
        description: 'Delete (revoke) a specific auth token (session) for the authenticated user. Cannot delete the current session.',
        params: {
          type: 'object',
          properties: {
            jti: {
              type: 'string',
              format: 'uuid',
              description: 'The JWT ID of the token to delete',
            },
          },
          required: ['jti'],
        },
        response: {
          204: {
            type: 'null',
            description: 'Token successfully deleted',
          },
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
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
    async function deleteAuthTokenHandler (request, reply) {
      const { id: userId, jti: currentJti } = request.user
      const { jti } = request.params

      // Prevent users from deleting their current session
      if (jti === currentJti) {
        return reply.badRequest('Cannot delete the current session token')
      }

      const query = SQL`
        DELETE FROM auth_tokens
        WHERE jti = ${jti}
          AND owner_id = ${userId}
      `

      const result = await fastify.pg.query(query)

      if (result.rowCount === 0) {
        return reply.notFound('Auth token not found')
      }

      reply.code(204)
      return null
    }
  )
}
