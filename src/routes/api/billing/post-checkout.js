import { schemaBillingSession } from './schemas/schema-billing-session.js'
import {
  getStripeCustomerId,
  getUserBillingProfile,
  upsertStripeCustomer,
} from '#resources/billing/billing-queries.js'
import { withUserBillingLock } from '#resources/billing/with-user-billing-lock.js'
import { getLatestSubscription, isSubscriptionActive } from './subscriptions.js'

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
          409: {
            type: 'object',
            properties: { message: { type: 'string' } },
          },
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

      const stripe = fastify.billing.stripe
      if (!stripe) {
        return reply.internalServerError('Billing is not configured.')
      }

      const lookupKey = fastify.config.STRIPE_PRICE_LOOKUP_KEY
      if (!lookupKey) {
        return reply.internalServerError('Billing is not configured.')
      }

      const userId = request.user.id
      return withUserBillingLock({
        pg: fastify.pg,
        userId,
        operation: async client => {
          const existingSubscription = await getLatestSubscription({
            pg: client,
            userId,
          })

          if (existingSubscription?.provider === 'custom' && isSubscriptionActive(existingSubscription)) {
            return reply.conflict('An active custom subscription already grants access.')
          }
          if (
            existingSubscription?.provider === 'stripe' &&
            existingSubscription.status &&
            !['canceled', 'incomplete_expired'].includes(existingSubscription.status)
          ) {
            return reply.conflict('A Stripe subscription already exists; use the billing portal to manage it.')
          }

          const prices = await stripe.prices.list({
            lookup_keys: [lookupKey],
            limit: 1,
          })
          const price = prices.data[0]
          if (!price) {
            return reply.internalServerError('Price not found for lookup key.')
          }

          let customerId = await getStripeCustomerId({
            pg: client,
            userId,
          })

          if (!customerId) {
            const profile = await getUserBillingProfile({
              pg: client,
              userId,
            })

            if (!profile) {
              return reply.notFound('User not found')
            }

            const customer = await stripe.customers.create({
              email: profile.email,
              name: profile.username,
              metadata: {
                user_id: userId,
              },
            }, {
              idempotencyKey: userId,
            })

            customerId = await upsertStripeCustomer({
              pg: client,
              userId,
              stripeCustomerId: customer.id,
            })
          }

          const openSessions = await stripe.checkout.sessions.list({
            customer: customerId,
            status: 'open',
            limit: 1,
          })
          if (openSessions.data.length > 0) {
            return reply.conflict('A checkout session is already open for this customer.')
          }

          const baseUrl = `${fastify.config.TRANSPORT}://${fastify.config.HOST}`
          const successUrl = `${baseUrl}/account/?billing=success`
          const cancelUrl = `${baseUrl}/account/?billing=cancel`

          const session = await stripe.checkout.sessions.create({
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
        },
      })
    }
  )
}
