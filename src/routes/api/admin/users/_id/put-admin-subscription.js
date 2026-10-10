/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import { createCustomSubscription, getStripeCustomerId } from '#resources/billing/billing-queries.js'
import { withUserBillingLock } from '#resources/billing/with-user-billing-lock.js'
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
        display_name: displayName,
        current_period_end: currentPeriodEnd
      } = request.body

      const subscriptionId = await withUserBillingLock({
        pg: fastify.pg,
        userId: targetUserId,
        operation: async client => {
          const customerId = await getStripeCustomerId({ pg: client, userId: targetUserId })
          if (customerId) {
            const stripe = fastify.billing.stripe
            if (!stripe) {
              return undefined
            }

            const [subscriptions, sessions] = await Promise.all([
              stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 }),
              stripe.checkout.sessions.list({ customer: customerId, status: 'open', limit: 1 }),
            ])
            const activePlan = subscriptions.data.some(subscription =>
              !['canceled', 'incomplete_expired'].includes(subscription.status) &&
              subscription.items.data.some(item => item.price.lookup_key === fastify.config.STRIPE_PRICE_LOOKUP_KEY)
            )
            if (activePlan || sessions.data.length > 0) {
              return undefined
            }
          }

          return createCustomSubscription({
            pg: client,
            subscription: {
              userId: targetUserId,
              status: 'active',
              planCode: 'yearly_paid',
              displayName,
              currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
            },
          })
        },
      })

      if (!subscriptionId) {
        return reply.code(409).send({ error: 'Cannot replace an existing Stripe subscription with a custom grant.' })
      }

      reply.status(202)

      return {
        status: 'updated',
      }
    }
  )
}
