import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
/**
 * @import { PgClient } from '../types/pg-client.js'
 */
import {
  getStripeCustomerId,
  getUserIdByStripeCustomerId,
  upsertStripeCustomer,
  syncStripeSubscriptionToDb,
  createCustomSubscription,
  cancelStaleStripeSubscription,
} from './billing-queries.js'

/**
 * @param {(query: unknown) => Promise<{ rows: unknown[] }>} queryImpl
 */
function mockPg (queryImpl) {
  return /** @type {PgClient} */ (/** @type {unknown} */ ({
    query: queryImpl,
  }))
}

describe('billing-queries', () => {
  it('getStripeCustomerId returns stripe customer id for existing user', async () => {
    const pg = mockPg(async () => ({ rows: [{ stripe_customer_id: 'cus_123' }] }))

    const customerId = await getStripeCustomerId({
      pg,
      userId: 'user-1',
    })

    assert.equal(customerId, 'cus_123')
  })

  it('getStripeCustomerId returns undefined when no mapping exists', async () => {
    const pg = mockPg(async () => ({ rows: [] }))

    const customerId = await getStripeCustomerId({
      pg,
      userId: 'missing-user',
    })

    assert.equal(customerId, undefined)
  })

  it('getUserIdByStripeCustomerId returns user id for existing stripe customer', async () => {
    const pg = mockPg(async () => ({ rows: [{ user_id: 'user-abc' }] }))

    const userId = await getUserIdByStripeCustomerId({
      pg,
      stripeCustomerId: 'cus_abc',
    })

    assert.equal(userId, 'user-abc')
  })

  it('upsertStripeCustomer returns customer id from upsert result', async () => {
    const pg = mockPg(async () => ({ rows: [{ stripe_customer_id: 'cus_saved' }] }))

    const customerId = await upsertStripeCustomer({
      pg,
      userId: 'user-1',
      stripeCustomerId: 'cus_saved',
    })

    assert.equal(customerId, 'cus_saved')
  })

  it('syncStripeSubscriptionToDb issues one atomic query', async () => {
    /** @type {unknown[]} */
    const queries = []
    const pg = mockPg(async (query) => {
      queries.push(query)
      return { rows: [] }
    })

    await syncStripeSubscriptionToDb({
      pg,
      data: {
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_1',
        status: 'active',
        planCode: 'yearly_paid',
        priceId: 'price_1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 86400000),
        cancelAt: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        paymentMethodBrand: 'visa',
        paymentMethodLast4: '4242',
        latestInvoiceStatus: 'paid',
        latestInvoicePaidAt: new Date(),
        latestInvoiceSettled: true,
      },
    })

    assert.equal(queries.length, 1)
  })

  it('createCustomSubscription writes supertype and subtype atomically', async () => {
    /** @type {unknown[]} */
    const queries = []
    const pg = mockPg(async (query) => {
      queries.push(query)
      return { rows: [{ id: 'sub-custom-1' }] }
    })

    const subscriptionId = await createCustomSubscription({
      pg,
      subscription: {
        userId: 'user-1',
        status: 'active',
        planCode: 'yearly_paid',
        displayName: 'Gift',
        currentPeriodEnd: null,
      },
    })

    assert.equal(subscriptionId, 'sub-custom-1')
    assert.equal(queries.length, 1)
  })

  it('cancelStaleStripeSubscription executes cancellation update query', async () => {
    /** @type {unknown[]} */
    const queries = []
    const pg = mockPg(async (query) => {
      queries.push(query)
      return { rows: [] }
    })

    await cancelStaleStripeSubscription({ pg, userId: 'user-1' })

    assert.equal(queries.length, 1)
  })
})
