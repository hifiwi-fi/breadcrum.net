/// <reference lib="dom" />

/** @import { SchemaTypeAdminUserReadClient } from '#routes/api/admin/users/schemas/schema-admin-user-read.js' */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render } from 'preact-render-to-string'
import { JSDOM } from 'jsdom'
import { UserRowView } from './user-row-view.js'
import { tc } from '#client/lib/typed-component.js'

/** @type {SchemaTypeAdminUserReadClient} */
const user = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'subscriber',
  email: 'subscriber@example.com',
  email_confirmed: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  admin: false,
  newsletter_subscription: false,
}

/** @param {Partial<SchemaTypeAdminUserReadClient>} subscription */
function badge (subscription) {
  const dom = new JSDOM(render(tc(UserRowView, { user: { ...user, ...subscription } })))
  try {
    const badges = dom.window.document.querySelectorAll('.bc-user-status-row .bc-user-badge')
    const result = badges[badges.length - 1]
    assert.ok(result)
    return { text: result.textContent.trim(), classes: result.className }
  } finally {
    dom.window.close()
  }
}

test('custom lifetime entitlement with a null plan code is paid, not free', () => {
  const result = badge({ subscription_provider: 'custom', subscription_status: 'active', subscription_plan: null, subscription_period_end: null, subscription_display_name: 'Gift' })
  assert.match(result.text, /Paid access: Subscription \(custom: Gift, active\)/)
  assert.match(result.classes, /bc-user-badge-true/)
  assert.doesNotMatch(result.text, /Free plan/)
})

test('expired custom and Stripe subscriptions do not show active entitlement', () => {
  for (const provider of ['custom', 'stripe']) {
    const result = badge({ subscription_provider: provider, subscription_status: 'active', subscription_period_end: '2000-01-01T00:00:00.000Z', subscription_plan: 'yearly_paid' })
    assert.match(result.text, /No paid access: yearly_paid/)
    assert.match(result.text, /expired/)
    assert.match(result.classes, /bc-user-badge-false/)
    assert.doesNotMatch(result.classes, /bc-user-badge-true/)
  }
})

test('Stripe active and trialing status alone does not confirm settlement', () => {
  for (const status of ['active', 'trialing']) {
    const result = badge({ subscription_provider: 'stripe', subscription_status: status, subscription_period_end: '2999-01-01T00:00:00.000Z', subscription_plan: null, subscription_cancel_at_period_end: true })
    assert.match(result.text, /Paid access unverified: Subscription/)
    assert.match(result.text, /canceling/)
    assert.match(result.classes, /bc-user-badge-warning/)
    assert.doesNotMatch(result.classes, /bc-user-badge-true/)
  }
})

test('inactive subscriptions retain provider and status even without a plan code', () => {
  for (const status of ['canceled', 'past_due', 'incomplete', 'unpaid', null]) {
    const result = badge({ subscription_provider: 'stripe', subscription_status: status, subscription_plan: null })
    assert.match(result.text, /No paid access: Subscription \(stripe,/)
    assert.doesNotMatch(result.text, /Free plan/)
    assert.doesNotMatch(result.classes, /bc-user-badge-true/)
  }
  assert.equal(badge({ subscription_provider: null, subscription_plan: null }).text, 'Free plan')
})
