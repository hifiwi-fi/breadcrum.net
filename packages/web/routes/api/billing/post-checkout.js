import { schemaBillingSession } from './schemas/schema-billing-session.js'
import {
  getStripeCustomerId,
  getUserBillingProfile,
  upsertStripeCustomer,
} from '@breadcrum/resources/billing/billing-queries.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function postBillingCheckout (fastify, _opts) {
  fastify.post(
    '/checkout',
    {
      preHandler: fastify.auth([fastify.verifyJWT, fastify.notDisabled], {
        relation: 'and',
      }),
      schema: {
        tags: ['billing'],
        response: {
          201: schemaBillingSession,
        },
      },
    },
    async function postBillingCheckoutHandler (request, reply) {
      const { billing_enabled: billingEnabled } = await fastify.getFlags({
        frontend: true,
        backend: false,
      })

      if (!billingEnabled) {
        return reply.notFound()
      }

      const lookupKey = fastify.config.STRIPE_PRICE_LOOKUP_KEY
      if (!lookupKey) {
        return reply.internalServerError('Billing is not configured.')
      }

      const prices = await fastify.billing.stripe.prices.list({
        lookup_keys: [lookupKey],
        limit: 1,
      })
      const price = prices.data[0]
      if (!price) {
        return reply.internalServerError('Price not found for lookup key.')
      }

      const userId = request.user.id
      let customerId = await getStripeCustomerId({
        pg: fastify.pg,
        userId,
      })

      if (!customerId) {
        const profile = await getUserBillingProfile({
          pg: fastify.pg,
          userId,
        })

        if (!profile) {
          return reply.notFound('User not found')
        }

        const customer = await fastify.billing.stripe.customers.create({
          email: profile.email,
          name: profile.username,
          metadata: {
            user_id: userId,
          },
        }, {
          idempotencyKey: userId,
        })

        customerId = await upsertStripeCustomer({
          pg: fastify.pg,
          userId,
          stripeCustomerId: customer.id,
        })
      }

      const baseUrl = `${fastify.config.TRANSPORT}://${fastify.config.HOST}`
      const successUrl = `${baseUrl}/account/?billing=success`
      const cancelUrl = `${baseUrl}/account/?billing=cancel`

      const session = await fastify.billing.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        allow_promotion_codes: true,
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        subscription_data: {
          metadata: {
            user_id: userId,
          },
        },
      })

      if (!session.url) {
        return reply.internalServerError('Checkout session missing URL.')
      }

      return reply.code(201).send({
        url: session.url,
      })
    }
  )
}
