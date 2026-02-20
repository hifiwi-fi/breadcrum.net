/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import { createCustomSubscription } from '@breadcrum/resources/billing/billing-queries.js'
import { schemaAdminSubscriptionUpdate } from './schemas/schema-admin-subscription-update.js'

/**
 * Admin route to create or update a custom subscription for a specific user.
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function putAdminCustomSubscription (fastify, _opts) {
  fastify.put(
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
        body: schemaAdminSubscriptionUpdate,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async function putAdminCustomSubscriptionHandler (request, reply) {
      const { id: targetUserId } = request.params
      const {
        status = 'active',
        plan_code: planCode = 'yearly_paid',
        display_name: displayName,
        current_period_end: currentPeriodEnd
      } = request.body

      await createCustomSubscription({
        pg: fastify.pg,
        subscription: {
          userId: targetUserId,
          status,
          planCode,
          displayName,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
        },
      })

      reply.status(202)

      return {
        status: 'updated',
      }
    }
  )
}
