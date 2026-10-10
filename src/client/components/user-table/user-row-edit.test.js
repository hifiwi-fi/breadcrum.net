/// <reference lib="dom" />

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { subscriptionDateToPeriodEnd, subscriptionPeriodEndToDate, UserRowEdit } from './user-row-edit.js'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { JSDOM } from 'jsdom'
import { tc } from '#client/lib/typed-component.js'

/** @import { SchemaTypeAdminUserReadClient } from '#routes/api/admin/users/schemas/schema-admin-user-read.js' */

test('custom subscription dates grant access through the entire selected UTC day', () => {
  for (const [date, end] of [
    ['2026-10-07', '2026-10-08T00:00:00.000Z'],
    ['2026-12-31', '2027-01-01T00:00:00.000Z'],
    ['2028-02-29', '2028-03-01T00:00:00.000Z'],
    ['2026-03-08', '2026-03-09T00:00:00.000Z'],
    ['2026-11-01', '2026-11-02T00:00:00.000Z'],
  ]) {
    assert.ok(date && end)
    assert.equal(subscriptionDateToPeriodEnd(date), end)
    assert.ok(new Date(`${date}T23:59:59.999Z`) < new Date(end))
    assert.equal(subscriptionPeriodEndToDate(end), date, 'editing and saving must not extend the expiry by another day')
  }
})

test('unlimited custom subscriptions retain a null expiry and an empty date input', () => {
  assert.equal(subscriptionDateToPeriodEnd(null), null)
  assert.equal(subscriptionPeriodEndToDate(null), '')
  assert.equal(subscriptionPeriodEndToDate(undefined), '')
})

test('non-midnight existing expiry retains its UTC calendar date', () => {
  assert.equal(subscriptionPeriodEndToDate('2026-10-07T15:30:00.000Z'), '2026-10-07')
})

for (const existing of [false, true]) {
  test(`${existing ? 'editing' : 'granting'} a custom subscription submits an inclusive date`, async t => {
    const dom = new JSDOM('<main></main>')
    /** @type {Array<[string, PropertyDescriptor | undefined]>} */
    const descriptors = ['window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
    Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
    const container = dom.window.document.querySelector('main')
    assert.ok(container)
    t.after(async () => {
      await act(() => { render(null, container) })
      dom.window.close()
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    })
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
      subscription_provider: existing ? 'custom' : null,
      subscription_display_name: existing ? 'Gift' : null,
      subscription_period_end: existing ? '2026-10-08T00:00:00.000Z' : null,
    }
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }))
    await act(async () => { render(tc(UserRowEdit, { user, apiUrl: '/api' }), container) })
    if (!existing) {
      const open = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Grant subscription')
      assert.ok(open)
      await act(() => { open.click() })
      const unlimited = container.querySelector('input[name="sub_unlimited"]')
      assert.ok(unlimited instanceof dom.window.HTMLInputElement)
      await act(() => { unlimited.click() })
    }
    const name = container.querySelector('input[name="sub_display_name"]')
    const date = container.querySelector('input[name="sub_period_end"]')
    assert.ok(name instanceof dom.window.HTMLInputElement)
    assert.ok(date instanceof dom.window.HTMLInputElement)
    assert.equal(date.disabled, false)
    if (existing) assert.equal(date.value, '2026-10-07', 'editing displays the inclusive day, not the exclusive boundary')
    name.value = 'Gift'
    date.value = '2026-10-07'
    const save = Array.from(container.querySelectorAll('button')).find(button => button.textContent === (existing ? 'Update' : 'Grant'))
    assert.ok(save)
    await act(async () => { save.click() })
    assert.equal(fetchMock.mock.callCount(), 1)
    const call = fetchMock.mock.calls[0]
    assert.equal(call?.arguments[0], `/api/admin/users/${user.id}/custom-subscription`)
    assert.equal(call?.arguments[1]?.method, 'put')
    assert.deepEqual(JSON.parse(/** @type {string} */ (call?.arguments[1]?.body)), { display_name: 'Gift', current_period_end: '2026-10-08T00:00:00.000Z' })
  })
}
