/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PoolClient } from 'pg'
 * @import { Stripe } from 'stripe'
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { syncStripeSubscription } from './sync.js'

test('Stripe synchronization locks the customer before reading remote state and maps configured prices', async () => {
  /** @type {unknown[]} */
  const queries = []
  /** @type {string[]} */
  const order = []
  const client = {
    async query (/** @type {unknown} */ query) {
      queries.push(query)
      const text = /** @type {{ strings?: readonly string[] }} */ (query).strings?.join(' ') ?? ''
      order.push(text.includes('pg_advisory_xact_lock') ? 'lock' : text.includes('select user_id') ? 'mapping' : 'write')
      if (text.includes('select user_id')) {
        return { rows: [{ user_id: 'user-1' }] }
      }
      return { rows: [] }
    },
  }
  const pg = /** @type {FastifyInstance['pg']} */ (/** @type {unknown} */ ({
    async transact (/** @type {(client: PoolClient) => Promise<unknown>} */ callback) {
      return callback(/** @type {PoolClient} */ (/** @type {unknown} */ (client)))
    },
  }))
  const stripe = /** @type {Stripe} */ (/** @type {unknown} */ ({
    subscriptions: {
      async list () {
        order.push('stripe-read')
        return {
          data: [{
            id: 'sub_1',
            status: 'active',
            items: {
              data: [{
                price: { id: 'price_1', lookup_key: 'annual' },
                current_period_start: 1_800_000_000,
                current_period_end: 1_831_536_000,
              }],
            },
            latest_invoice: {
              status: 'paid',
              status_transitions: { paid_at: 1_800_000_000 },
            },
            default_payment_method: null,
            cancel_at: null,
            cancel_at_period_end: false,
            trial_end: null,
          }],
        }
      },
    },
  }))

  await syncStripeSubscription({
    stripe,
    pg,
    customerId: 'cus_1',
    lookupKey: 'annual',
  })

  assert.match(/** @type {{ strings: readonly string[] }} */ (queries[0]).strings.join(' '), /pg_advisory_xact_lock/)
  assert.deepEqual(order, ['lock', 'mapping', 'lock', 'stripe-read', 'write'])
  assert.match(JSON.stringify(queries.at(-1)), /yearly_paid/)
  assert.ok(queries.length >= 3, 'Expected lock, customer mapping, and subscription upsert queries')
})
