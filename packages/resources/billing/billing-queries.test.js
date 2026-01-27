import { describe, it } from 'node:test'
// @ts-expect-error - used when todo tests are implemented
import assert from 'node:assert/strict' // eslint-disable-line no-unused-vars

describe('billing-queries', () => {
  // --- getBillingCustomerId ---

  it('getBillingCustomerId returns provider_customer_id for existing user', { todo: true })

  it('getBillingCustomerId returns undefined for non-existent user', { todo: true })

  // --- upsertBillingCustomer ---

  it('upsertBillingCustomer inserts new billing customer', { todo: true })

  it('upsertBillingCustomer updates existing billing customer on conflict', { todo: true })

  // --- getUserBillingProfile ---

  it('getUserBillingProfile returns email and username', { todo: true })

  it('getUserBillingProfile returns undefined for non-existent user', { todo: true })

  // --- getUserIdByCustomerId ---

  it('getUserIdByCustomerId returns user_id for existing customer', { todo: true })

  it('getUserIdByCustomerId returns undefined for non-existent customer', { todo: true })

  // --- upsertSubscription ---

  it('upsertSubscription inserts new subscription', { todo: true })

  it('upsertSubscription updates existing subscription on conflict', { todo: true })

  it('upsertSubscription stores payment method brand and last4', { todo: true })

  it('upsertSubscription handles null optional fields', { todo: true })

  // --- insertWebhookEvent ---

  it('insertWebhookEvent inserts new event and returns true', { todo: true })

  it('insertWebhookEvent returns false for duplicate event ID (idempotent)', { todo: true })

  // --- getAllBillingCustomerIds ---

  it('getAllBillingCustomerIds returns all customer IDs for provider', { todo: true })

  it('getAllBillingCustomerIds returns empty array when no customers exist', { todo: true })

  it('getAllBillingCustomerIds filters by provider', { todo: true })
})

describe('syncStripeSubscription', () => {
  it('syncs active subscription state from Stripe to DB', { todo: true })

  it('extracts period dates from subscription.items.data[0]', { todo: true })

  it('extracts payment method brand and last4 from expanded default_payment_method', { todo: true })

  it('handles missing payment method gracefully', { todo: true })

  it('does nothing when customer ID has no matching user', { todo: true })

  it('does nothing when customer has no subscriptions', { todo: true })

  it('upserts subscription using provider_subscription_id for idempotency', { todo: true })

  it('stores cancel_at and cancel_at_period_end for canceling subscriptions', { todo: true })

  it('extracts plan_code from price lookup_key, falling back to nickname', { todo: true })
})
