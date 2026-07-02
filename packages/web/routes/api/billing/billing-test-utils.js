import { randomUUID } from 'node:crypto'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TestContext } from 'node:test'
 */

const testPassword = 'TestPassword123!'

/**
 * Creates a test user registered via the API and returns credentials.
 * Registers a cleanup hook on t.after() to delete the user and their tokens.
 *
 * @param {FastifyInstance} app
 * @param {TestContext} t
 * @param {object} [options]
 * @param {boolean} [options.admin]
 * @returns {Promise<{ userId: string, username: string, email: string, password: string, token: string }>}
 */
export async function createTestUser (app, t, options = {}) {
  const { admin = false } = options
  const testUsername = `test_user_${Date.now()}_${randomUUID().slice(0, 8)}`
  const testEmail = `test_${Date.now()}_${randomUUID().slice(0, 8)}@example.com`

  const registerRes = await app.inject({
    method: 'POST',
    url: '/api/register',
    payload: {
      username: testUsername,
      email: testEmail,
      password: testPassword,
      newsletter_subscription: false,
    },
  })

  if (registerRes.statusCode === 403) {
    throw new Error('Registration is disabled')
  }
  if (registerRes.statusCode !== 201) {
    throw new Error(`Registration failed with status ${registerRes.statusCode}: ${registerRes.payload}`)
  }

  const registerBody = JSON.parse(registerRes.payload)
  const userId = registerBody.user.id

  if (admin) {
    await app.pg.query('UPDATE users SET admin = true WHERE id = $1', [userId])
  }

  t.after(async () => {
    await app.pg.query('DELETE FROM auth_tokens WHERE owner_id = $1', [userId])
    await app.pg.query('DELETE FROM users WHERE id = $1', [userId])
  })

  return {
    userId,
    username: testUsername,
    email: testEmail,
    password: testPassword,
    token: registerBody.token,
  }
}

/**
 * Enables the billing_enabled and optionally subscriptions_required feature flags
 * in the DB. Registers a cleanup hook to restore them to false.
 *
 * @param {FastifyInstance} app
 * @param {TestContext} t
 * @param {object} [options]
 * @param {boolean} [options.subscriptionsRequired]
 * @param {number} [options.freeBookmarksPerMonth]
 * @returns {Promise<void>}
 */
export async function enableBillingFlags (app, t, options = {}) {
  const { subscriptionsRequired = false, freeBookmarksPerMonth } = options

  await setFlag(app, 'billing_enabled', true)

  if (subscriptionsRequired) {
    await setFlag(app, 'subscriptions_required', true)
  }

  if (freeBookmarksPerMonth !== undefined) {
    await setFlag(app, 'free_bookmarks_per_month', freeBookmarksPerMonth)
  }

  t.after(async () => {
    await setFlag(app, 'billing_enabled', false)
    await setFlag(app, 'subscriptions_required', false)
    if (freeBookmarksPerMonth !== undefined) {
      await setFlag(app, 'free_bookmarks_per_month', 10)
    }
  })
}

/**
 * Explicitly disables the billing_enabled flag in the DB.
 * Use this in tests that assert the "billing disabled" code path to guard against
 * cross-test state pollution when running multiple test files concurrently.
 *
 * @param {FastifyInstance} app
 * @returns {Promise<void>}
 */
export async function disableBillingFlag (app) {
  await setFlag(app, 'billing_enabled', false)
}

/**
 * @param {FastifyInstance} app
 * @param {string} name
 * @param {boolean | number} value
 */
async function setFlag (app, name, value) {
  await app.pg.query(
    'INSERT INTO feature_flags (name, value) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET value = excluded.value',
    [name, JSON.stringify(value)]
  )
}

/**
 * Inserts a custom subscription for a user directly into the DB.
 * Registers a cleanup hook to remove it.
 *
 * @param {FastifyInstance} app
 * @param {TestContext} t
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.displayName]
 * @param {Date | null} [params.currentPeriodEnd]
 * @returns {Promise<{ subscriptionId: string }>}
 */
export async function insertCustomSubscription (app, t, { userId, displayName = 'Test Grant', currentPeriodEnd = null }) {
  // Upsert supertype row
  const subResult = await app.pg.query(
    `INSERT INTO subscriptions (user_id, provider)
     VALUES ($1, 'custom')
     ON CONFLICT (user_id) DO UPDATE SET provider = 'custom'
     RETURNING id`,
    [userId]
  )
  const subscriptionId = subResult.rows[0].id

  // Upsert custom subtype row
  await app.pg.query(
    `INSERT INTO custom_subscriptions (subscription_id, status, plan_code, display_name, current_period_start, current_period_end)
     VALUES ($1, 'active', 'yearly_paid', $2, now(), $3)
     ON CONFLICT (subscription_id) DO UPDATE SET
       status = 'active',
       display_name = excluded.display_name,
       current_period_end = excluded.current_period_end`,
    [subscriptionId, displayName, currentPeriodEnd]
  )

  t.after(async () => {
    await app.pg.query('DELETE FROM subscriptions WHERE user_id = $1', [userId])
  })

  return { subscriptionId }
}

/**
 * Inserts a Stripe customer mapping for a user.
 * Registers a cleanup hook to remove it.
 *
 * @param {FastifyInstance} app
 * @param {TestContext} t
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.stripeCustomerId]
 * @returns {Promise<{ stripeCustomerId: string }>}
 */
export async function insertStripeCustomer (app, t, { userId, stripeCustomerId = `cus_test_${randomUUID().slice(0, 8)}` }) {
  await app.pg.query(
    `INSERT INTO stripe_customers (user_id, stripe_customer_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id`,
    [userId, stripeCustomerId]
  )

  t.after(async () => {
    await app.pg.query('DELETE FROM stripe_customers WHERE user_id = $1', [userId])
  })

  return { stripeCustomerId }
}

/**
 * Asserts the shape of the billing subscription response body.
 *
 * @param {import('node:assert')} assert
 * @param {Record<string, unknown>} body
 */
export function assertBillingShape (assert, body) {
  assert.strictEqual(typeof body['active'], 'boolean', 'active should be boolean')
  assert.ok('subscription' in body, 'Should have subscription field')
  assert.ok('usage' in body, 'Should have usage field')

  const sub = /** @type {Record<string, unknown>} */ (body['subscription'])
  assert.ok('provider' in sub, 'subscription should have provider')
  assert.ok('status' in sub, 'subscription should have status')
  assert.ok('current_period_end' in sub, 'subscription should have current_period_end')
  assert.ok('cancel_at_period_end' in sub, 'subscription should have cancel_at_period_end')

  const usage = /** @type {Record<string, unknown>} */ (body['usage'])
  assert.strictEqual(typeof usage['bookmarks_this_month'], 'number', 'usage.bookmarks_this_month should be number')
  assert.ok('bookmarks_limit' in usage, 'usage should have bookmarks_limit')
  assert.ok(usage['window_start'], 'usage should have window_start')
  assert.ok(usage['window_end'], 'usage should have window_end')
}
