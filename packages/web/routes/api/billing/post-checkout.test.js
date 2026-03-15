import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../test/helper.js'
import {
  createTestUser,
  enableBillingFlags,
  disableBillingFlag,
} from './billing-test-utils.js'

const STRIPE_TEST_ENV = {
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] ?? 'sk_test_fakekeyfortesting00000000000',
  STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_fakesecretfortesting000000000000',
}

// Tests below require a live or test-mode Stripe key that can make real API calls.
// They are skipped when only a fake key is present.
const hasLiveStripeKey = (process.env['STRIPE_SECRET_KEY'] ?? '').startsWith('sk_test_') &&
  process.env['STRIPE_SECRET_KEY'] !== 'sk_test_fakekeyfortesting00000000000'

await suite('POST /api/billing/checkout', async () => {
  await test('flag and auth gating', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 404 when billing_enabled flag is false', async (t) => {
      await disableBillingFlag(app)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 when billing disabled')
    })

    await t.test('returns 401 when unauthenticated', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/checkout',
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        headers: { authorization: 'Bearer invalid-token' },
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })
  })

  // Each Stripe integration test gets its own outer test() so build(t) cleanup
  // ordering is correct (subtest cleanups run before outer test's app.close).
  await test('attempts Stripe price lookup and returns error with fake key', async (t) => {
    if (hasLiveStripeKey) {
      t.skip('Using live Stripe key; skipping fake-key error path test')
      return
    }

    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('fake key Stripe error', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        headers: { authorization: `Bearer ${user.token}` },
      })

      // Stripe rejects the fake key with an auth error, surfaced as 500
      assert.ok(
        res.statusCode === 500 || res.statusCode === 401,
        `Should return 500 or 401 when Stripe rejects fake key, got ${res.statusCode}`
      )
    })
  })

  await test('returns 201 with redirect URL when using real Stripe test key', async (t) => {
    if (!hasLiveStripeKey) {
      t.skip('STRIPE_SECRET_KEY not set to a real test-mode key; skipping live Stripe test')
      return
    }

    const app = await build(t, {
      STRIPE_SECRET_KEY: /** @type {string} */ (process.env['STRIPE_SECRET_KEY']),
      STRIPE_WEBHOOK_SECRET: /** @type {string} */ (process.env['STRIPE_WEBHOOK_SECRET']),
    })

    await t.test('live Stripe checkout', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 201, 'Should return 201')
      const body = JSON.parse(res.payload)
      assert.ok(body.url, 'Should return a checkout URL')
      assert.strictEqual(new URL(body.url).hostname, 'checkout.stripe.com', 'URL should be a Stripe checkout URL')
    })
  })
})
