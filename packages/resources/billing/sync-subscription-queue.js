/**
 * @import { PgBoss, SendOptions } from 'pg-boss'
 * @import { Queue } from 'pg-boss'
 */

import { defaultQueueOptions } from '../pgboss/default-job-options.js'

/**
 * Data required to sync a subscription.
 *
 * @typedef {{
 *   customerId: string
 * }} SyncSubscriptionData
 */

export const syncSubscriptionQName = 'sync-subscription'

/** @type {number} */
const THROTTLE_SECONDS = 30

/**
 * Request shape for sending a sync subscription job
 *
 * @typedef {{
 *   data: SyncSubscriptionData
 *   options?: SendOptions
 * }} SyncSubscriptionRequest
 */

/**
 * Typed Queue Wrapper for Sync Subscription
 *
 * @typedef {{
 *   name: string
 *   send: (request: SyncSubscriptionRequest) => Promise<string | null>
 * }} SyncSubscriptionPgBossQ
 */

/**
 * pg-boss worker for sync subscription jobs
 *
 * @typedef {string} SyncSubscriptionPgBossW
 */

/**
 * Factory function to create a typed queue wrapper for subscription sync.
 *
 * Uses sendThrottled with customerId as the singleton key so that
 * multiple webhook events for the same customer within the throttle
 * window result in a single sync job. Since syncStripeSubscription
 * always fetches the latest state from Stripe, one job is sufficient.
 *
 * @param {Object} params
 * @param {PgBoss} params.boss - PgBoss instance
 * @param {Omit<Queue, 'name'>} [params.queueOptions] - Optional queue options
 * @returns {Promise<SyncSubscriptionPgBossQ>} Promise resolving to typed queue wrapper
 */
export async function createSyncSubscriptionQ ({
  boss,
  queueOptions = defaultQueueOptions
}) {
  const syncQueueOptions = {
    ...defaultQueueOptions,
    retryLimit: 4,
    retryDelay: 5,
    retryBackoff: true,
  }

  await boss.createQueue(syncSubscriptionQName, {
    ...syncQueueOptions,
    ...queueOptions,
  })

  return {
    name: syncSubscriptionQName,

    send: (request) =>
      boss.sendThrottled(
        syncSubscriptionQName,
        request.data,
        request.options ?? {},
        THROTTLE_SECONDS,
        request.data.customerId
      ),
  }
}
