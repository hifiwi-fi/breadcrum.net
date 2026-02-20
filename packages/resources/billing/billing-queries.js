/**
 * @import { PgClient } from '../types/pg-client.js'
 * @import { QueryResult } from 'pg'
 */

import SQL from '@nearform/sql'

// ---------------------------------------------------------------------------
// Stripe customers
// ---------------------------------------------------------------------------

/**
 * @param {{ pg: PgClient, userId: string }} params
 * @returns {Promise<string | undefined>}
 */
export async function getStripeCustomerId ({ pg, userId }) {
  const query = SQL`
    select stripe_customer_id
    from stripe_customers
    where user_id = ${userId}
    fetch first 1 rows only
  `

  /** @type {QueryResult<{ stripe_customer_id: string }>} */
  const results = await pg.query(query)
  return results.rows[0]?.stripe_customer_id
}

/**
 * @param {{ pg: PgClient, userId: string, stripeCustomerId: string }} params
 * @returns {Promise<string>}
 */
export async function upsertStripeCustomer ({ pg, userId, stripeCustomerId }) {
  const query = SQL`
    insert into stripe_customers (
      user_id,
      stripe_customer_id
    ) values (
      ${userId},
      ${stripeCustomerId}
    )
    on conflict (user_id)
    do update set
      stripe_customer_id = excluded.stripe_customer_id,
      updated_at = now()
    returning stripe_customer_id
  `

  /** @type {QueryResult<{ stripe_customer_id: string }>} */
  const results = await pg.query(query)
  const row = results.rows[0]
  if (!row?.stripe_customer_id) {
    throw new Error('Failed to upsert stripe customer')
  }
  return row.stripe_customer_id
}

/**
 * @param {{ pg: PgClient, stripeCustomerId: string }} params
 * @returns {Promise<string | undefined>}
 */
export async function getUserIdByStripeCustomerId ({ pg, stripeCustomerId }) {
  const query = SQL`
    select user_id
    from stripe_customers
    where stripe_customer_id = ${stripeCustomerId}
    fetch first 1 rows only
  `

  /** @type {QueryResult<{ user_id: string }>} */
  const results = await pg.query(query)
  return results.rows[0]?.user_id
}

// ---------------------------------------------------------------------------
// User billing profile (shared)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} UserBillingProfile
 * @property {string} email
 * @property {string} username
 */

/**
 * @param {{ pg: PgClient, userId: string }} params
 * @returns {Promise<UserBillingProfile | undefined>}
 */
export async function getUserBillingProfile ({ pg, userId }) {
  const query = SQL`
    select
      u.email,
      u.username
    from users u
    where u.id = ${userId}
    fetch first 1 rows only
  `

  /** @type {QueryResult<UserBillingProfile>} */
  const results = await pg.query(query)
  return results.rows[0]
}

// ---------------------------------------------------------------------------
// Generic subscriptions
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SubscriptionUpsert
 * @property {string} userId
 * @property {'stripe' | 'custom'} provider
 */

/**
 * Upserts a generic subscription row. For Stripe subscriptions, use the
 * returned id to upsert the stripe_subscriptions row.
 *
 * Uses (user_id, provider) as the conflict target so each provider gets
 * at most one subscription row per user.
 *
 * @param {{ pg: PgClient, subscription: SubscriptionUpsert }} params
 * @returns {Promise<string>} The subscription id
 */
export async function upsertSubscription ({ pg, subscription }) {
  const query = SQL`
    insert into subscriptions (
      user_id,
      provider
    ) values (
      ${subscription.userId},
      ${subscription.provider}
    )
    on conflict (user_id, provider)
    do update set
      updated_at = now()
    returning id
  `

  /** @type {QueryResult<{ id: string }>} */
  const results = await pg.query(query)
  const row = results.rows[0]
  if (!row?.id) {
    throw new Error('Failed to upsert subscription')
  }
  return row.id
}

// ---------------------------------------------------------------------------
// Stripe subscriptions (provider-specific details)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} StripeSubscriptionUpsert
 * @property {string} subscriptionId
 * @property {string} stripeSubscriptionId
 * @property {string} status
 * @property {string | null} planCode
 * @property {string | null} priceId
 * @property {Date | null} currentPeriodStart
 * @property {Date | null} currentPeriodEnd
 * @property {Date | null} cancelAt
 * @property {boolean} cancelAtPeriodEnd
 * @property {Date | null} trialEnd
 * @property {string | null} paymentMethodBrand
 * @property {string | null} paymentMethodLast4
 * @property {string | null} latestInvoiceStatus
 * @property {Date | null} latestInvoicePaidAt
 * @property {boolean} latestInvoiceSettled
 */

/**
 * @param {{ pg: PgClient, stripeSubscription: StripeSubscriptionUpsert }} params
 * @returns {Promise<void>}
 */
export async function upsertStripeSubscription ({ pg, stripeSubscription }) {
  const query = SQL`
    insert into stripe_subscriptions (
      subscription_id,
      stripe_subscription_id,
      status,
      plan_code,
      price_id,
      current_period_start,
      current_period_end,
      cancel_at,
      cancel_at_period_end,
      trial_end,
      payment_method_brand,
      payment_method_last4,
      latest_invoice_status,
      latest_invoice_paid_at,
      latest_invoice_settled
    ) values (
      ${stripeSubscription.subscriptionId},
      ${stripeSubscription.stripeSubscriptionId},
      ${stripeSubscription.status},
      ${stripeSubscription.planCode},
      ${stripeSubscription.priceId},
      ${stripeSubscription.currentPeriodStart},
      ${stripeSubscription.currentPeriodEnd},
      ${stripeSubscription.cancelAt},
      ${stripeSubscription.cancelAtPeriodEnd},
      ${stripeSubscription.trialEnd},
      ${stripeSubscription.paymentMethodBrand},
      ${stripeSubscription.paymentMethodLast4},
      ${stripeSubscription.latestInvoiceStatus},
      ${stripeSubscription.latestInvoicePaidAt},
      ${stripeSubscription.latestInvoiceSettled}
    )
    on conflict (subscription_id)
    do update set
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      plan_code = excluded.plan_code,
      price_id = excluded.price_id,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at = excluded.cancel_at,
      cancel_at_period_end = excluded.cancel_at_period_end,
      trial_end = excluded.trial_end,
      payment_method_brand = excluded.payment_method_brand,
      payment_method_last4 = excluded.payment_method_last4,
      latest_invoice_status = excluded.latest_invoice_status,
      latest_invoice_paid_at = excluded.latest_invoice_paid_at,
      latest_invoice_settled = excluded.latest_invoice_settled,
      updated_at = now()
  `

  await pg.query(query)
}

// ---------------------------------------------------------------------------
// Atomic sync (CTE combining subscription + stripe_subscription upsert)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SyncStripeSubscriptionParams
 * @property {string} userId
 * @property {string} stripeSubscriptionId
 * @property {string} status
 * @property {string | null} planCode
 * @property {string | null} priceId
 * @property {Date | null} currentPeriodStart
 * @property {Date | null} currentPeriodEnd
 * @property {Date | null} cancelAt
 * @property {boolean} cancelAtPeriodEnd
 * @property {Date | null} trialEnd
 * @property {string | null} paymentMethodBrand
 * @property {string | null} paymentMethodLast4
 * @property {string | null} latestInvoiceStatus
 * @property {Date | null} latestInvoicePaidAt
 * @property {boolean} latestInvoiceSettled
 */

/**
 * Atomically upserts the generic subscriptions row and the stripe_subscriptions row
 * in a single CTE query, avoiding a two-step non-atomic operation.
 *
 * @param {{ pg: PgClient, data: SyncStripeSubscriptionParams }} params
 * @returns {Promise<void>}
 */
export async function syncStripeSubscriptionToDb ({ pg, data }) {
  const query = SQL`
    with upserted_subscription as (
      insert into subscriptions (user_id, provider)
      values (${data.userId}, 'stripe')
      on conflict (user_id, provider)
      do update set updated_at = now()
      returning id
    )
    insert into stripe_subscriptions (
      subscription_id,
      stripe_subscription_id,
      status,
      plan_code,
      price_id,
      current_period_start,
      current_period_end,
      cancel_at,
      cancel_at_period_end,
      trial_end,
      payment_method_brand,
      payment_method_last4,
      latest_invoice_status,
      latest_invoice_paid_at,
      latest_invoice_settled
    )
    select
      id,
      ${data.stripeSubscriptionId},
      ${data.status},
      ${data.planCode},
      ${data.priceId},
      ${data.currentPeriodStart},
      ${data.currentPeriodEnd},
      ${data.cancelAt},
      ${data.cancelAtPeriodEnd},
      ${data.trialEnd},
      ${data.paymentMethodBrand},
      ${data.paymentMethodLast4},
      ${data.latestInvoiceStatus},
      ${data.latestInvoicePaidAt},
      ${data.latestInvoiceSettled}
    from upserted_subscription
    on conflict (subscription_id)
    do update set
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      plan_code = excluded.plan_code,
      price_id = excluded.price_id,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at = excluded.cancel_at,
      cancel_at_period_end = excluded.cancel_at_period_end,
      trial_end = excluded.trial_end,
      payment_method_brand = excluded.payment_method_brand,
      payment_method_last4 = excluded.payment_method_last4,
      latest_invoice_status = excluded.latest_invoice_status,
      latest_invoice_paid_at = excluded.latest_invoice_paid_at,
      latest_invoice_settled = excluded.latest_invoice_settled,
      updated_at = now()
  `
  await pg.query(query)
}

/**
 * Marks an existing stripe subscription as canceled when Stripe reports no active
 * subscriptions for a customer. Only updates if a local row already exists.
 *
 * @param {{ pg: PgClient, userId: string }} params
 * @returns {Promise<void>}
 */
export async function cancelStaleStripeSubscription ({ pg, userId }) {
  const query = SQL`
    update stripe_subscriptions ss
    set
      status = 'canceled',
      updated_at = now()
    from subscriptions s
    where s.id = ss.subscription_id
      and s.user_id = ${userId}
      and s.provider = 'stripe'
      and ss.status != 'canceled'
  `
  await pg.query(query)
}

// ---------------------------------------------------------------------------
// Custom subscriptions (admin-created)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} CustomSubscriptionUpsert
 * @property {string} subscriptionId
 * @property {string} status
 * @property {string | null} planCode
 * @property {string} displayName
 * @property {Date | null} currentPeriodStart
 * @property {Date | null} currentPeriodEnd
 */

/**
 * @param {{ pg: PgClient, customSubscription: CustomSubscriptionUpsert }} params
 * @returns {Promise<void>}
 */
export async function upsertCustomSubscription ({ pg, customSubscription }) {
  const query = SQL`
    insert into custom_subscriptions (
      subscription_id,
      status,
      plan_code,
      display_name,
      current_period_start,
      current_period_end
    ) values (
      ${customSubscription.subscriptionId},
      ${customSubscription.status},
      ${customSubscription.planCode},
      ${customSubscription.displayName},
      ${customSubscription.currentPeriodStart},
      ${customSubscription.currentPeriodEnd}
    )
    on conflict (subscription_id)
    do update set
      status = excluded.status,
      plan_code = excluded.plan_code,
      display_name = excluded.display_name,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      updated_at = now()
  `

  await pg.query(query)
}

/**
 * @typedef {object} CustomSubscriptionParams
 * @property {string} userId
 * @property {string} status
 * @property {string | null} planCode
 * @property {string} displayName
 * @property {Date | null} currentPeriodEnd
 */

/**
 * Creates a custom (non-Stripe) subscription for a user.
 *
 * @param {{ pg: PgClient, subscription: CustomSubscriptionParams }} params
 * @returns {Promise<string>} The subscription id
 */
export async function createCustomSubscription ({ pg, subscription }) {
  const subscriptionId = await upsertSubscription({
    pg,
    subscription: {
      userId: subscription.userId,
      provider: 'custom',
    },
  })

  await upsertCustomSubscription({
    pg,
    customSubscription: {
      subscriptionId,
      status: subscription.status,
      planCode: subscription.planCode,
      displayName: subscription.displayName,
      currentPeriodStart: new Date(),
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
  })

  return subscriptionId
}

/**
 * Deletes a custom (non-Stripe) subscription for a user.
 *
 * @param {{ pg: PgClient, userId: string }} params
 * @returns {Promise<void>}
 */
export async function deleteCustomSubscription ({ pg, userId }) {
  const query = SQL`
    delete from subscriptions
    where user_id = ${userId}
    and provider = 'custom'
  `
  await pg.query(query)
}
