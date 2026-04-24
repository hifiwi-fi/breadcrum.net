// Used by the billing sync button in the account/billing frontend component
import { getStripeCustomerId } from '@breadcrum/resources/billing/billing-queries.js'
import { syncStripeSubscription } from '@breadcrum/resources/billing/sync.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function postBillingSync (fastify, _opts) {
  fastify.post(
    '/sync',
    {
      preHandler: fastify.auth([fastify.verifyJWT, fastify.notDisabled], {
        relation: 'and',
      }),
      schema: {
        tags: ['billing'],
        response: {
          200: {
            type: 'object',
            properties: {
              synced: { type: 'boolean' },
            },
          },
        },
      },
    },
    async function postBillingSyncHandler (request, reply) {
      const { billing_enabled: billingEnabled } = await fastify.getFlags({
        frontend: true,
        backend: false,
      })

      if (!billingEnabled) {
        return reply.notFound()
      }

      const userId = request.user.id
      const customerId = await getStripeCustomerId({
        pg: fastify.pg,
        userId,
      })

      if (!customerId) {
        return reply.notFound('No billing customer found')
      }

      await syncStripeSubscription({
        stripe: fastify.billing.stripe,
        pg: fastify.pg,
        customerId,
      })

      return reply.code(200).send({ synced: true })
    }
  )
}
