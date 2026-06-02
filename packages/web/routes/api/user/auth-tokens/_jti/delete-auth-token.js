import { deleteAuthTokenByJti } from '../auth-token-actions.js'

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
          400: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
    },
    async function deleteAuthTokenHandler (request, reply) {
      const { id: userId, jti: currentJti } = request.user
      const { jti } = request.params

      const result = await deleteAuthTokenByJti(fastify, {
        userId,
        currentJti,
        jti,
      })

      if (!result.ok && result.statusCode === 400) {
        return reply.badRequest(result.message)
      }

      if (!result.ok) {
        return reply.notFound('Auth token not found')
      }

      return reply.code(204).send(null)
    }
  )
}
