/// <reference lib="dom" />

/** @import { TypeBillingSubscriptionReadClient } from '#routes/api/billing/schemas/schema-billing-subscription-read.js' */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { QueryClient, QueryObserver } from '@tanstack/preact-query'
import { syncCheckoutBilling } from './billing-field.js'

/** @param {boolean} active @returns {TypeBillingSubscriptionReadClient} */
function billing (active) {
  return {
    active,
    subscription: { provider: 'stripe', display_name: null, status: 'active', current_period_end: null, cancel_at: null, cancel_at_period_end: false, trial_end: null, payment_method: null },
    usage: { bookmarks_this_month: 0, bookmarks_limit: null, window_start: '2026-10-01T00:00:00.000Z', window_end: '2026-11-01T00:00:00.000Z' },
  }
}

for (const active of [true, false]) {
  test(`checkout notice reflects freshly fetched active=${active}`, async t => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    t.after(() => client.clear())
    // Seed the opposite state to ensure the notice is not based on cached billing.
    client.setQueryData(['billing'], billing(!active))
    const observer = new QueryObserver(client, { queryKey: ['billing'], queryFn: async () => billing(active) })
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }))
    const notice = await syncCheckoutBilling('/api', observer.refetch)
    assert.equal(notice, active ? 'Subscription activated.' : 'Checkout completed. Paid access is pending confirmation.')
    assert.equal(fetchMock.mock.calls[0]?.arguments[0], '/api/billing/sync')
    assert.equal(fetchMock.mock.calls[0]?.arguments[1]?.method, 'post')
    assert.ok(fetchMock.mock.calls[0]?.arguments[1]?.signal instanceof AbortSignal)
  })
}

test('failed sync HTTP responses cannot produce an activation notice', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Sync unavailable', { status: 503, statusText: 'Service Unavailable' }))
  const refetch = t.mock.fn(async () => { throw new Error('Must not refetch after failed sync') })
  await assert.rejects(syncCheckoutBilling('/api', refetch), /503 Service Unavailable: Sync unavailable/)
  assert.equal(refetch.mock.callCount(), 0)
})

for (const failure of [new Error('Network unavailable'), new DOMException('Sync timed out', 'TimeoutError')]) {
  test(`failed sync request: ${failure.message}`, async t => {
    t.mock.method(globalThis, 'fetch', async () => { throw failure })
    await assert.rejects(syncCheckoutBilling('/api', async () => { throw new Error('Must not refetch') }), failure)
  })
}

test('failed refetch cannot report activation from stale active billing', async t => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  t.after(() => client.clear())
  client.setQueryData(['billing'], billing(true))
  const observer = new QueryObserver(client, { queryKey: ['billing'], queryFn: async () => { throw new Error('Billing refresh failed') } })
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }))
  await assert.rejects(syncCheckoutBilling('/api', observer.refetch), /Billing refresh failed/)
})
