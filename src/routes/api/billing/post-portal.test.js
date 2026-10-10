/** @import { Stripe } from 'stripe' */
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

await suite('POST /api/billing/portal', async () => {
  await test('flag and auth gating', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 404 when no customer mapping exists while billing UI is disabled', async (t) => {
      await disableBillingFlag(app)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/portal',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 when billing disabled')
    })

    await t.test('returns 401 when unauthenticated', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/portal',
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async (t) => {
      await enableBillingFlags(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/portal',
        headers: { authorization: 'Bearer invalid-token' },
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })

    await t.test('returns 404 when user has no Stripe customer mapping', async (t) => {
      await enableBillingFlags(app, t)
      const user = await createTestUser(app, t)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/portal',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 when no Stripe customer found')
    })
  })

  await test('disabled user with an existing customer can manage billing', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)
    await t.test('opens a portal using the disabled user customer mapping', async (t) => {
      await enableBillingFlags(app, t)
      await disableBillingFlag(app)
      const user = await createTestUser(app, t)
      const { stripeCustomerId } = await insertStripeCustomer(app, t, { userId: user.userId })
      await app.pg.query('update users set disabled = true where id = $1', [user.userId])
      assert.ok(app.billing.stripe)
      let portalCustomer
      const create = t.mock.method(app.billing.stripe.billingPortal.sessions, 'create', async (/** @type {Stripe.BillingPortal.SessionCreateParams} */ params) => {
        portalCustomer = params.customer
        return { url: 'https://billing.stripe.com/test-session' }
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/portal',
        headers: { authorization: `Bearer ${user.token}` },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.deepStrictEqual(res.json(), { url: 'https://billing.stripe.com/test-session' })
      assert.strictEqual(create.mock.callCount(), 1)
      assert.strictEqual(portalCustomer, stripeCustomerId)
    })
  })

  // Each Stripe integration test gets its own outer test() so build(t) cleanup
  // ordering is correct (subtest cleanups run before outer test's app.close).
  await test('attempts Stripe portal creation and returns error with fake key', async (t) => {
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
        url: '/api/billing/portal',
        headers: { authorization: `Bearer ${user.token}` },
      })

      // Stripe rejects the fake key with an auth error, surfaced as 500
      assert.ok(
        res.statusCode === 500 || res.statusCode === 401,
        `Should return 500 or 401 when Stripe rejects fake key, got ${res.statusCode}`
      )
    })
  })

  // Note: A live portal test is omitted because the billing portal requires a real
  // Stripe customer ID that exists in the Stripe account, which is not feasible
  // to set up in automated tests without a pre-existing customer fixture.
})
