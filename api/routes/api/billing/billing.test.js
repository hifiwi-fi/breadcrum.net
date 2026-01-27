import { test, suite } from 'node:test'
import assert from 'node:assert/strict'
/**
 * @import { SubscriptionJoinedRow } from './subscription-view.js'
 */
import {
  SubscriptionView,
  StripeSubscriptionView,
  CustomSubscriptionView,
} from './subscription-view.js'
import { getMonthlyWindow, isSubscriptionActive } from './subscriptions.js'

await suite('billing view model', async () => {
  await test('creates StripeSubscriptionView from joined row', async () => {
    const row = /** @type {SubscriptionJoinedRow} */ ({
      id: 'sub-1',
      user_id: 'user-1',
      provider: 'stripe',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
      stripe_status: 'active',
      stripe_plan_code: 'yearly_paid',
      stripe_current_period_start: new Date('2026-01-01T00:00:00.000Z'),
      stripe_current_period_end: new Date('2027-01-01T00:00:00.000Z'),
      stripe_cancel_at: null,
      stripe_cancel_at_period_end: false,
      stripe_trial_end: null,
      payment_method_brand: 'visa',
      payment_method_last4: '4242',
      stripe_latest_invoice_status: 'paid',
      stripe_latest_invoice_paid_at: new Date('2026-01-01T01:00:00.000Z'),
      stripe_latest_invoice_settled: true,
      custom_status: null,
      custom_plan_code: null,
      custom_display_name: null,
      custom_current_period_start: null,
      custom_current_period_end: null,
    })

    const view = SubscriptionView.fromJoinedRow(row)
    assert.ok(view instanceof StripeSubscriptionView)
    assert.equal(view?.provider, 'stripe')
    assert.equal(view?.plan_code, 'yearly_paid')
  })

  await test('creates CustomSubscriptionView from joined row', async () => {
    const row = /** @type {SubscriptionJoinedRow} */ ({
      id: 'sub-2',
      user_id: 'user-2',
      provider: 'custom',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
      stripe_status: null,
      stripe_plan_code: null,
      stripe_current_period_start: null,
      stripe_current_period_end: null,
      stripe_cancel_at: null,
      stripe_cancel_at_period_end: null,
      stripe_trial_end: null,
      payment_method_brand: null,
      payment_method_last4: null,
      stripe_latest_invoice_status: null,
      stripe_latest_invoice_paid_at: null,
      stripe_latest_invoice_settled: null,
      custom_status: 'active',
      custom_plan_code: 'yearly_paid',
      custom_display_name: 'Gift',
      custom_current_period_start: new Date('2026-01-01T00:00:00.000Z'),
      custom_current_period_end: null,
    })

    const view = SubscriptionView.fromJoinedRow(row)
    assert.ok(view instanceof CustomSubscriptionView)
    assert.equal(view?.provider, 'custom')
    assert.equal(view?.display_name, 'Gift')
  })

  await test('Stripe subscription active status requires settled invoice', async () => {
    const stripeView = new StripeSubscriptionView({
      id: 'sub-3',
      user_id: 'user-3',
      provider: 'stripe',
      status: 'active',
      plan_code: 'yearly_paid',
      display_name: null,
      current_period_start: new Date('2026-01-01T00:00:00.000Z'),
      current_period_end: new Date('2027-01-01T00:00:00.000Z'),
      cancel_at: null,
      cancel_at_period_end: false,
      trial_end: null,
      payment_method_brand: 'visa',
      payment_method_last4: '4242',
      latest_invoice_status: 'open',
      latest_invoice_paid_at: null,
      latest_invoice_settled: false,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
    })

    assert.equal(isSubscriptionActive(stripeView, new Date('2026-06-01T00:00:00.000Z')), false)

    stripeView.latest_invoice_settled = true
    assert.equal(isSubscriptionActive(stripeView, new Date('2026-06-01T00:00:00.000Z')), true)
  })

  await test('Stripe trialing subscription also requires settled invoice', async () => {
    const stripeView = new StripeSubscriptionView({
      id: 'sub-4',
      user_id: 'user-4',
      provider: 'stripe',
      status: 'trialing',
      plan_code: 'yearly_paid',
      display_name: null,
      current_period_start: new Date('2026-01-01T00:00:00.000Z'),
      current_period_end: new Date('2027-01-01T00:00:00.000Z'),
      cancel_at: null,
      cancel_at_period_end: false,
      trial_end: new Date('2026-02-01T00:00:00.000Z'),
      payment_method_brand: null,
      payment_method_last4: null,
      latest_invoice_status: 'open',
      latest_invoice_paid_at: null,
      latest_invoice_settled: false,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
    })

    assert.equal(isSubscriptionActive(stripeView, new Date('2026-01-15T00:00:00.000Z')), false, 'trialing with unsettled invoice is not active')

    stripeView.latest_invoice_settled = true
    assert.equal(isSubscriptionActive(stripeView, new Date('2026-01-15T00:00:00.000Z')), true, 'trialing with settled invoice is active')
  })

  await test('getMonthlyWindow returns UTC calendar month boundaries', async () => {
    const now = new Date('2026-02-15T12:34:56.000Z')
    const { windowStart, windowEnd } = getMonthlyWindow(now)

    assert.equal(windowStart.toISOString(), '2026-02-01T00:00:00.000Z')
    assert.equal(windowEnd.toISOString(), '2026-03-01T00:00:00.000Z')
  })
})
