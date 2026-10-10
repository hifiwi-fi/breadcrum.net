// Used by the billing sync button in the account/billing frontend component
import { getStripeCustomerId } from '#resources/billing/billing-queries.js'
import { syncStripeSubscription } from '#resources/billing/sync.js'

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
      const stripe = fastify.billing.stripe
      if (!stripe) {
        return reply.internalServerError('Billing is not configured.')
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
        stripe,
        pg: fastify.pg,
        customerId,
        lookupKey: fastify.config.STRIPE_PRICE_LOOKUP_KEY,
      })

      return reply.code(200).send({ synced: true })
    }
  )
}
