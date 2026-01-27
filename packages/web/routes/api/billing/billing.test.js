import { test, suite } from 'node:test'
// @ts-expect-error - used when todo tests are implemented
import assert from 'node:assert' // eslint-disable-line no-unused-vars
// @ts-expect-error - used when todo tests are implemented
import { build } from '../../../test/helper.js' // eslint-disable-line no-unused-vars

await suite('Billing API Tests', { concurrency: false, timeout: 30000 }, async () => {
  // --- GET /api/billing/ (subscription) ---

  await test('GET /api/billing/ returns 401 without auth', { todo: true })

  await test('GET /api/billing/ returns free plan for user without subscription', { todo: true })

  await test('GET /api/billing/ returns paid plan for user with active subscription', { todo: true })

  await test('GET /api/billing/ returns correct usage counts within monthly window', { todo: true })

  await test('GET /api/billing/ returns payment method when available', { todo: true })

  await test('GET /api/billing/ returns cancel_at_period_end when subscription is canceling', { todo: true })

  await test('GET /api/billing/ returns 404 when billing_enabled flag is false', { todo: true })

  // --- POST /api/billing/checkout ---

  await test('POST /api/billing/checkout returns 401 without auth', { todo: true })

  await test('POST /api/billing/checkout creates Stripe customer and checkout session', { todo: true })

  await test('POST /api/billing/checkout reuses existing Stripe customer', { todo: true })

  await test('POST /api/billing/checkout uses idempotency key on customer creation', { todo: true })

  await test('POST /api/billing/checkout resolves price via lookup key', { todo: true })

  await test('POST /api/billing/checkout returns 404 when billing_enabled flag is false', { todo: true })

  // --- POST /api/billing/portal ---

  await test('POST /api/billing/portal returns 401 without auth', { todo: true })

  await test('POST /api/billing/portal returns portal session URL', { todo: true })

  await test('POST /api/billing/portal returns 404 when no billing customer exists', { todo: true })

  await test('POST /api/billing/portal returns 404 when billing_enabled flag is false', { todo: true })

  // --- POST /api/billing/sync ---

  await test('POST /api/billing/sync returns 401 without auth', { todo: true })

  await test('POST /api/billing/sync calls syncStripeSubscription and returns synced: true', { todo: true })

  await test('POST /api/billing/sync returns 404 when no billing customer exists', { todo: true })

  await test('POST /api/billing/sync returns 404 when billing_enabled flag is false', { todo: true })

  // --- POST /api/billing/webhook ---

  await test('POST /api/billing/webhook returns 400 without stripe-signature header', { todo: true })

  await test('POST /api/billing/webhook returns 400 with invalid signature', { todo: true })

  await test('POST /api/billing/webhook returns 200 and calls sync for allowed event types', { todo: true })

  await test('POST /api/billing/webhook deduplicates events by event ID', { todo: true })

  await test('POST /api/billing/webhook ignores events not in allowedEvents set', { todo: true })

  await test('POST /api/billing/webhook handles missing customer ID gracefully', { todo: true })

  await test('POST /api/billing/webhook handles sync failure gracefully (still returns 200)', { todo: true })

  await test('POST /api/billing/webhook returns 404 when billing_enabled flag is false', { todo: true })
})
