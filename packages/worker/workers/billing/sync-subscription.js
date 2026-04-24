/**
 * @import { FastifyInstance } from 'fastify'
 * @import { WorkHandler } from '@breadcrum/resources/pgboss/types.js'
 * @import { SyncSubscriptionData } from '@breadcrum/resources/billing/sync-subscription-queue.js'
 */

import { syncStripeSubscription } from '@breadcrum/resources/billing/sync.js'

/**
 * pg-boss compatible subscription sync processor.
 * Receives a customerId and syncs their subscription state from Stripe.
 *
 * @param {object} params
 * @param {FastifyInstance} params.fastify
 * @return {WorkHandler<SyncSubscriptionData>} pg-boss handler
 */
export function makeSyncSubscriptionP ({ fastify }) {
  const logger = fastify.log

  /** @type {WorkHandler<SyncSubscriptionData>} */
  return async function syncSubscriptionP (jobs) {
    for (const job of jobs) {
      const { customerId } = job.data
      const log = logger.child({ jobId: job.id, customerId })

      const { stripe } = fastify.billing

      try {
        await syncStripeSubscription({
          stripe,
          pg: fastify.pg,
          customerId,
        })
        log.info('Subscription synced')
      } catch (err) {
        log.error({ err }, 'Failed to sync subscription')
        throw err
      }
    }
  }
}
