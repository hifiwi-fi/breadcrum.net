/// <reference lib="dom" />

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { getOnlineStatus } from './useOnlineStatus.js'

suite('online status helpers', () => {
  test('reads navigator-like online state', () => {
    assert.equal(getOnlineStatus({ onLine: true }), true)
    assert.equal(getOnlineStatus({ onLine: false }), false)
  })

  test('defaults to online when navigator state is unavailable', () => {
    assert.equal(getOnlineStatus(), true)
    assert.equal(getOnlineStatus({}), true)
  })
})
