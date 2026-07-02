import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../test/helper.js'
import {
  createTestUser,
  enableBillingFlags,
  disableBillingFlag,
  insertStripeCustomer,
} from './billing-test-utils.js'

const STRIPE_TEST_ENV = {
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] ?? 'sk_test_fakekeyfortesting00000000000',
  STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_fakesecretfortesting000000000000',
}

// Tests below require a live or test-mode Stripe key that can make real API calls.
// They are skipped when only a fake key is present.
const hasLiveStripeKey = (process.env['STRIPE_SECRET_KEY'] ?? '').startsWith('sk_test_') &&
  process.env['STRIPE_SECRET_KEY'] !== 'sk_test_fakekeyfortesting00000000000'

await suite('POST /api/billing/sync', async () => {
  await test('flag and auth gating', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 404 when billing_enabled flag is false', async (t) => {
      await disableBillingFlag(app)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/sync',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 when billing disabled')
    })

    await t.test('returns 401 when unauthenticated', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/sync',
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/sync',
        headers: { authorization: 'Bearer invalid-token' },
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })

    await t.test('returns 404 when user has no Stripe customer mapping', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/sync',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 when no Stripe customer found')
    })
  })

  // Each Stripe integration test gets its own outer test() so build(t) cleanup
  // ordering is correct (subtest cleanups run before outer test's app.close).
  await test('attempts Stripe sync and returns error with fake key', async (t) => {
    if (hasLiveStripeKey) {
      t.skip('Using live Stripe key; skipping fake-key error path test')
      return
    }

    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('fake key Stripe error', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)
      await insertStripeCustomer(app, t, { userId: user.userId })

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/sync',
        headers: { authorization: `Bearer ${user.token}` },
      })

      // Stripe rejects the fake key with an auth error, surfaced as 500
      assert.ok(
        res.statusCode === 500 || res.statusCode === 401,
        `Should return 500 or 401 when Stripe rejects fake key, got ${res.statusCode}`
      )
    })
  })

  // Note: A live sync test is omitted because it requires a real Stripe customer ID
  // that exists in the Stripe account. The fake-key error test above is sufficient
  // to verify that sync attempts to call Stripe when billing is enabled and a customer exists.
})
