import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../test/helper.js'
import {
  enableBillingFlags,
  disableBillingFlag,
} from '../billing-test-utils.js'

const STRIPE_WEBHOOK_SECRET = process.env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_fakesecretfortesting000000000000'

const STRIPE_TEST_ENV = {
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] ?? 'sk_test_fakekeyfortesting00000000000',
  STRIPE_WEBHOOK_SECRET,
}

/**
 * Build a minimal Stripe webhook event payload.
 *
 * @param {string} eventType - Stripe event type (e.g. 'customer.subscription.updated')
 * @param {Record<string, unknown>} [dataObject] - Event data.object fields
 * @returns {string} JSON string of the event payload
 */
function buildStripeEventPayload (eventType, dataObject = {}) {
  return JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: eventType,
    data: {
      object: dataObject,
    },
  })
}

/**
 * Generate a Stripe-compatible webhook signature header for the given payload.
 *
 * @param {import('fastify').FastifyInstance & { billing: { stripe: import('stripe').Stripe } }} app
 * @param {string} payload - The raw JSON payload string
 * @returns {string} The value for the stripe-signature header
 */
function signWebhookPayload (app, payload) {
  return app.billing.stripe.webhooks.generateTestHeaderString({
    payload,
    secret: STRIPE_WEBHOOK_SECRET,
  })
}

await suite('POST /api/billing/webhook', async () => {
  await test('flag gating', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 404 when billing_enabled flag is false', async () => {
      await disableBillingFlag(app)
      const payload = buildStripeEventPayload('customer.subscription.updated', { customer: 'cus_test123' })
      const signature = signWebhookPayload(/** @type {any} */ (app), payload)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook/',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 when billing disabled')
    })
  })

  await test('signature validation', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 400 when stripe-signature header is missing', async (t) => {
      await enableBillingFlags(app, t)

      const payload = buildStripeEventPayload('customer.subscription.updated', { customer: 'cus_test123' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook/',
        headers: {
          'content-type': 'application/json',
        },
        payload,
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 when stripe-signature is missing')
    })

    await t.test('returns 400 when stripe-signature is invalid', async (t) => {
      await enableBillingFlags(app, t)

      const payload = buildStripeEventPayload('customer.subscription.updated', { customer: 'cus_test123' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook/',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 't=12345,v1=invalidsignature',
        },
        payload,
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 when signature is invalid')
    })
  })

  await test('event processing', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 200 with received:true for valid event with customer ID', async (t) => {
      await enableBillingFlags(app, t)

      const payload = buildStripeEventPayload('customer.subscription.updated', { customer: 'cus_test123' })
      const signature = signWebhookPayload(/** @type {any} */ (app), payload)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook/',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 for valid signed event')
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.received, true, 'Should return received:true')
    })

    await t.test('returns 200 with received:true for valid event without customer ID', async (t) => {
      await enableBillingFlags(app, t)

      // Event with no customer field — should still return 200 (no queue send, but not an error)
      const payload = buildStripeEventPayload('customer.subscription.updated', {})
      const signature = signWebhookPayload(/** @type {any} */ (app), payload)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook/',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 even when customer ID is missing')
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.received, true, 'Should return received:true')
    })

    await t.test('returns 200 with received:true for unrecognized event type', async (t) => {
      await enableBillingFlags(app, t)

      // An event type not in allowedEvents — handler still returns 200 without enqueuing
      const payload = buildStripeEventPayload('charge.succeeded', { customer: 'cus_test123' })
      const signature = signWebhookPayload(/** @type {any} */ (app), payload)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook/',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 for unrecognized event types')
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.received, true, 'Should return received:true')
    })

    await t.test('returns 200 for checkout.session.completed with customer ID', async (t) => {
      await enableBillingFlags(app, t)

      const payload = buildStripeEventPayload('checkout.session.completed', {
        customer: 'cus_test456',
        payment_status: 'paid',
      })
      const signature = signWebhookPayload(/** @type {any} */ (app), payload)

      const res = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook/',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
        },
        payload,
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 for checkout.session.completed')
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.received, true, 'Should return received:true')
    })
  })
})
