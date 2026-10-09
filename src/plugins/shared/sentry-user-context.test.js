import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSentryUserFromFastifyRequest, getSentryUserFromPgBossJobData } from './sentry-user-context.js'

test('getSentryUserFromFastifyRequest uses JWT user id', () => {
  assert.deepEqual(getSentryUserFromFastifyRequest({
    user: { id: 'user-1' },
  }), { id: 'user-1' })
})

test('getSentryUserFromFastifyRequest falls back to feed token user id', () => {
  assert.deepEqual(getSentryUserFromFastifyRequest({
    feedTokenUser: { userId: 'user-2' },
  }), { id: 'user-2' })
})

test('getSentryUserFromFastifyRequest ignores missing or non-string user ids', () => {
  assert.equal(getSentryUserFromFastifyRequest({}), null)
  assert.equal(getSentryUserFromFastifyRequest({ user: { id: 123 } }), null)
})

test('getSentryUserFromPgBossJobData uses job data user id', () => {
  assert.deepEqual(getSentryUserFromPgBossJobData({ userId: 'user-3' }), { id: 'user-3' })
})

test('getSentryUserFromPgBossJobData ignores jobs without string user id', () => {
  assert.equal(getSentryUserFromPgBossJobData(undefined), null)
  assert.equal(getSentryUserFromPgBossJobData({}), null)
  assert.equal(getSentryUserFromPgBossJobData({ userId: 123 }), null)
})
