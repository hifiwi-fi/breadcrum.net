/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import { getStripeCustomerId } from '@breadcrum/resources/billing/billing-queries.js'
import { syncStripeSubscription } from '@breadcrum/resources/billing/sync.js'

/**
 * Admin route to trigger a billing subscription sync for a specific user from Stripe.
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function postAdminBillingSync (fastify, _opts) {
  fastify.post(
    '/billing-sync',
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
    async function postAdminBillingSyncHandler (request, reply) {
      const { id: targetUserId } = request.params

      const customerId = await getStripeCustomerId({
        pg: fastify.pg,
        userId: targetUserId,
      })

      if (!customerId) {
        return reply.notFound('No Stripe customer found for this user')
      }

      await syncStripeSubscription({
        stripe: fastify.billing.stripe,
        pg: fastify.pg,
        customerId,
      })

      return { status: 'synced' }
    }
  )
}
