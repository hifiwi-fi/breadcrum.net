/**
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 */

/**
 * @import { SubscriptionJoinedRow } from './subscription-view.js'
 */

import SQL from '@nearform/sql'
import { SubscriptionView } from './subscription-view.js'

/**
 * Fetches the most recent subscription for a user and normalizes
 * provider-specific fields into a uniform subscription view model.
 *
 * @param {{ pg: PgClient, userId: string }} params
 * @returns {Promise<SubscriptionView | undefined>}
 */
export async function getLatestSubscription ({ pg, userId }) {
  const query = SQL`
    select
      s.id,
      s.user_id,
      s.provider,
      s.created_at,
      s.updated_at,
      ss.status as stripe_status,
      ss.plan_code as stripe_plan_code,
      ss.current_period_start as stripe_current_period_start,
      ss.current_period_end as stripe_current_period_end,
      ss.cancel_at as stripe_cancel_at,
      ss.cancel_at_period_end as stripe_cancel_at_period_end,
      ss.trial_end as stripe_trial_end,
      ss.payment_method_brand,
      ss.payment_method_last4,
      ss.latest_invoice_status as stripe_latest_invoice_status,
      ss.latest_invoice_paid_at as stripe_latest_invoice_paid_at,
      ss.latest_invoice_settled as stripe_latest_invoice_settled,
      cs.status as custom_status,
      cs.plan_code as custom_plan_code,
      cs.display_name as custom_display_name,
      cs.current_period_start as custom_current_period_start,
      cs.current_period_end as custom_current_period_end
    from subscriptions s
    left join stripe_subscriptions ss
      on ss.subscription_id = s.id
      and s.provider = 'stripe'
    left join custom_subscriptions cs
      on cs.subscription_id = s.id
      and s.provider = 'custom'
    where s.user_id = ${userId}
    order by s.updated_at desc nulls last, s.created_at desc
    fetch first 1 rows only
  `

  /** @type {QueryResult<SubscriptionJoinedRow>} */
  const results = await pg.query(query)
  const row = results.rows[0]

  return SubscriptionView.fromJoinedRow(row)
}

/**
 * Determines if a subscription should be treated as active.
 *
 * @param {SubscriptionView | undefined} subscription
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isSubscriptionActive (subscription, now = new Date()) {
  if (!subscription) return false
  return subscription.isActive(now)
}

/**
 * Returns the UTC month window for usage counting.
 * @param {Date} [now]
 * @returns {{ windowStart: Date, windowEnd: Date }}
 */
export function getMonthlyWindow (now = new Date()) {
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { windowStart, windowEnd }
}
