import { schemaBillingSubscriptionRead } from './schemas/schema-billing-subscription-read.js'
import {
  getLatestSubscription,
  isSubscriptionActive,
} from './subscriptions.js'
import { getMonthlyBookmarkUsage } from '../bookmarks/bookmark-usage.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *  SerializerSchemaOptions: {
 *       deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *  }
 * }>}
 */
export async function getBillingSubscription (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['billing'],
        response: {
          200: schemaBillingSubscriptionRead,
        },
      },
    },
    async function getBillingSubscriptionHandler (request, reply) {
      const {
        billing_enabled: billingEnabled,
        free_bookmarks_per_month: freeBookmarksPerMonth,
      } = await fastify.getFlags({
        frontend: true,
        backend: false,
      })

      if (!billingEnabled) {
        return reply.notFound()
      }

      const userId = request.user.id

      const subscription = await getLatestSubscription({
        pg: fastify.pg,
        userId,
      })

      const active = isSubscriptionActive(subscription)

      const usage = await getMonthlyBookmarkUsage({
        pg: fastify.pg,
        userId,
        limit: freeBookmarksPerMonth,
      })

      return reply.code(200).send({
        active,
        subscription: {
          provider: subscription?.provider ?? null,
          display_name: subscription?.display_name ?? null,
          status: subscription?.status ?? null,
          current_period_end: subscription?.current_period_end ?? null,
          cancel_at: subscription?.cancel_at ?? null,
          cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
          trial_end: subscription?.trial_end ?? null,
          payment_method: subscription?.payment_method_brand
            ? { brand: subscription.payment_method_brand, last4: subscription.payment_method_last4 }
            : null,
        },
        usage: {
          bookmarks_this_month: usage.count,
          bookmarks_limit: active ? null : usage.limit,
          window_start: usage.window_start,
          window_end: usage.window_end,
        },
      })
    }
  )
}
