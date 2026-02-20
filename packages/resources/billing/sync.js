/**
 * @import { Stripe as StripeType } from 'stripe'
 * @import { PgClient } from '../types/pg-client.js'
 */

import {
  getUserIdByStripeCustomerId,
  syncStripeSubscriptionToDb,
  cancelStaleStripeSubscription,
} from './billing-queries.js'

/**
 * @typedef {object} SyncParams
 * @property {StripeType} stripe
 * @property {PgClient} pg
 * @property {string} customerId
 */

/**
 * Fetches the latest subscription state from Stripe and upserts it into the DB.
 * This is the single source of truth for subscription state — called from
 * webhooks, the success sync endpoint, and background reconciliation.
 *
 * Uses a single atomic CTE query to upsert both:
 * 1. Generic `subscriptions` row (provider identity only)
 * 2. `stripe_subscriptions` row (Stripe-specific lifecycle + payment details)
 *
 * If Stripe returns no subscription for the customer, any existing local
 * stripe subscription row is marked as canceled.
 *
 * @param {SyncParams} params
 * @returns {Promise<void>}
 */
export async function syncStripeSubscription ({ stripe, pg, customerId }) {
  const userId = await getUserIdByStripeCustomerId({
    pg,
    stripeCustomerId: customerId,
  })

  if (!userId) return

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    expand: ['data.default_payment_method', 'data.latest_invoice'],
  })

  const subscription = subscriptions.data[0]

  if (!subscription) {
    // No active Stripe subscription found; mark any existing local record as canceled.
    await cancelStaleStripeSubscription({ pg, userId })
    return
  }

  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id ?? null
  const planCode = item?.price?.lookup_key ?? item?.price?.nickname ?? null
  const currentPeriodStart = toDate(item?.current_period_start)
  const currentPeriodEnd = toDate(item?.current_period_end)
  const latestInvoice = subscription.latest_invoice && typeof subscription.latest_invoice === 'object'
    ? subscription.latest_invoice
    : null
  const latestInvoiceStatus = latestInvoice?.status ?? null
  const latestInvoicePaidAt = toDate(latestInvoice?.status_transitions?.paid_at)
  const latestInvoiceSettled = latestInvoiceStatus === 'paid'

  /** @type {string | null} */
  let paymentMethodBrand = null
  /** @type {string | null} */
  let paymentMethodLast4 = null

  const pm = subscription.default_payment_method
  if (pm && typeof pm === 'object' && 'card' in pm && pm.card) {
    paymentMethodBrand = pm.card.brand ?? null
    paymentMethodLast4 = pm.card.last4 ?? null
  }

  // Atomically upsert subscription + stripe_subscription in a single CTE query
  await syncStripeSubscriptionToDb({
    pg,
    data: {
      userId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      planCode,
      priceId,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAt: toDate(subscription.cancel_at),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      trialEnd: toDate(subscription.trial_end),
      paymentMethodBrand,
      paymentMethodLast4,
      latestInvoiceStatus,
      latestInvoicePaidAt,
      latestInvoiceSettled,
    },
  })
}

/**
 * @param {number | null | undefined} epochSeconds
 * @returns {Date | null}
 */
function toDate (epochSeconds) {
  if (!epochSeconds) return null
  return new Date(epochSeconds * 1000)
}
