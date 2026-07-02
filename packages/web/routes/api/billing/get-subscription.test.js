import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../test/helper.js'
import {
  createTestUser,
  enableBillingFlags,
  disableBillingFlag,
  insertCustomSubscription,
  assertBillingShape,
} from './billing-test-utils.js'

// Tests require a real Stripe key to boot (STRIPE_SECRET_KEY is required by billingEnvSchema).
// A test-mode key is used so no live charges occur.
const STRIPE_TEST_ENV = {
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] ?? 'sk_test_fakekeyfortesting00000000000',
  STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_fakesecretfortesting000000000000',
}

await suite('GET /api/billing', async () => {
  await test('flag and auth gating', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 404 when billing_enabled flag is false', async (t) => {
      await disableBillingFlag(app)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 when billing disabled')
    })

    await t.test('returns 401 when unauthenticated', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: 'Bearer invalid-token' },
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })
  })

  await test('subscription state', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns billing summary for user with no subscription', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200')
      const body = JSON.parse(res.payload)

      assertBillingShape(assert, body)
      assert.strictEqual(body.active, false, 'User with no subscription should not be active')
      assert.strictEqual(body.subscription.provider, null, 'Provider should be null with no subscription')
      assert.strictEqual(body.subscription.status, null, 'Status should be null with no subscription')
    })

    await t.test('returns active:true and subscription details for user with active custom subscription', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)
      await insertCustomSubscription(app, t, { userId: user.userId, displayName: 'Gift' })

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200')
      const body = JSON.parse(res.payload)

      assertBillingShape(assert, body)
      assert.strictEqual(body.active, true, 'User with custom subscription should be active')
      assert.strictEqual(body.subscription.provider, 'custom', 'Provider should be custom')
      assert.strictEqual(body.subscription.status, 'active', 'Status should be active')
      assert.strictEqual(body.subscription.display_name, 'Gift', 'Display name should match')
      assert.strictEqual(body.subscription.payment_method, null, 'Custom subscription has no payment method')
    })

    await t.test('returns lifetime active subscription with null current_period_end', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)
      await insertCustomSubscription(app, t, {
        userId: user.userId,
        displayName: 'Lifetime',
        currentPeriodEnd: null,
      })

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)

      assert.strictEqual(body.active, true, 'Lifetime subscription should be active')
      assert.strictEqual(body.subscription.current_period_end, null, 'Lifetime subscription has null period end')
    })
  })

  await test('usage and quota', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('usage reflects free tier limit when subscriptions_required is enabled', async (t) => {
      await enableBillingFlags(app, t, { subscriptionsRequired: true, freeBookmarksPerMonth: 5 })
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)

      assert.strictEqual(body.active, false)
      assert.strictEqual(body.usage.bookmarks_this_month, 0, 'New user has 0 bookmarks this month')
      assert.strictEqual(body.usage.bookmarks_limit, 5, 'Limit should reflect feature flag value')
    })

    await t.test('active subscriber has null bookmarks_limit', async (t) => {
      await enableBillingFlags(app, t, { subscriptionsRequired: true, freeBookmarksPerMonth: 5 })
      const user = await createTestUser(app, t)
      await insertCustomSubscription(app, t, { userId: user.userId })

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)

      assert.strictEqual(body.active, true)
      assert.strictEqual(body.usage.bookmarks_limit, null, 'Active subscriber has no bookmark limit')
    })

    await t.test('usage window_start and window_end span the current UTC month', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)

      const now = new Date()
      const windowStart = new Date(/** @type {string} */ (body.usage.window_start))
      const windowEnd = new Date(/** @type {string} */ (body.usage.window_end))

      assert.strictEqual(windowStart.getUTCDate(), 1, 'window_start should be the 1st of the month')
      assert.strictEqual(windowStart.getUTCMonth(), now.getUTCMonth(), 'window_start should be current month')
      assert.ok(windowEnd > windowStart, 'window_end should be after window_start')
      assert.ok(now >= windowStart && now < windowEnd, 'now should be within the window')
    })
  })

  await test('user isolation', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('two different users see their own subscription state independently', async (t) => {
      await enableBillingFlags(app, t)
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      // Only user1 gets a custom subscription
      await insertCustomSubscription(app, t, { userId: user1.userId, displayName: 'Special' })

      const res1 = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user1.token}` },
      })
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/billing/',
        headers: { authorization: `Bearer ${user2.token}` },
      })

      const body1 = JSON.parse(res1.payload)
      const body2 = JSON.parse(res2.payload)

      assert.strictEqual(body1.active, true, 'User1 should be active')
      assert.strictEqual(body2.active, false, 'User2 should not be active')
      assert.strictEqual(body1.subscription.provider, 'custom')
      assert.strictEqual(body2.subscription.provider, null)
    })
  })
})
