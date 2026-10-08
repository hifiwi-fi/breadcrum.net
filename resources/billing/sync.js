/**
 * @import { Stripe as StripeType } from 'stripe'
 * @import { FastifyInstance } from 'fastify'
 */

import SQL from '@nearform/sql'
import {
  getUserIdByStripeCustomerId,
  syncStripeSubscriptionToDb,
  cancelStaleStripeSubscription,
} from './billing-queries.js'

/**
 * @typedef {object} SyncParams
 * @property {StripeType} stripe
 * @property {FastifyInstance['pg']} pg
 * @property {string} customerId
 * @property {string} lookupKey
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
export async function syncStripeSubscription ({ stripe, pg, customerId, lookupKey }) {
  await pg.transact(async client => {
    // Hold the customer lock across the Stripe read and database write so every sync entry point is ordered.
    await client.query(SQL`select pg_advisory_xact_lock(hashtextextended(${customerId}, 0))`)

    const userId = await getUserIdByStripeCustomerId({
      pg: client,
      stripeCustomerId: customerId,
    })

    if (!userId) {
      return
    }

    await client.query(SQL`select pg_advisory_xact_lock(1, hashtext(${userId}))`)

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      expand: ['data.default_payment_method', 'data.latest_invoice'],
    })

    const subscription = subscriptions.data.find(candidate =>
      !['canceled', 'incomplete_expired'].includes(candidate.status) &&
      candidate.items.data.some(item => item.price.lookup_key === lookupKey)
    )

    if (!subscription) {
      await cancelStaleStripeSubscription({ pg: client, userId })
      return
    }

    const item = subscription.items.data.find(item => item.price.lookup_key === lookupKey)
    if (!item) {
      throw new Error(`Stripe subscription ${subscription.id} has no configured billing price`)
    }
    const priceId = item.price.id
    const planCode = 'yearly_paid'
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

    await syncStripeSubscriptionToDb({
      pg: client,
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
  })
}

/**
 * @param {number | null | undefined} epochSeconds
 * @returns {Date | null}
 */
function toDate (epochSeconds) {
  if (epochSeconds == null) return null
  return new Date(epochSeconds * 1000)
}
