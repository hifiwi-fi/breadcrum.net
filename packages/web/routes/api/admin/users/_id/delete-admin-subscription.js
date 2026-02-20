/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import { deleteCustomSubscription } from '@breadcrum/resources/billing/billing-queries.js'

/**
 * Admin route to delete a custom subscription for a specific user.
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function deleteAdminCustomSubscription (fastify, _opts) {
  fastify.delete(
    '/custom-subscription',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async function deleteAdminCustomSubscriptionHandler (request, _reply) {
      const { id: targetUserId } = request.params

      await deleteCustomSubscription({
        pg: fastify.pg,
        userId: targetUserId,
      })

      return {
        status: 'deleted',
      }
    }
  )
}
