import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRole, roleDefaults } from './role.js'

test('CLI requires exactly one explicit supported role', () => {
  for (const role of ['all', 'api', 'worker']) {
    assert.equal(parseRole([`--role=${role}`]), role)
  }
  for (const args of [[], ['--role='], ['--role=web'], ['--role', 'api'], ['--role=api', '--role=worker'], ['--unknown']]) {
    assert.throws(() => parseRole(args), /role/)
  }
})

test('production role identities and metrics ports remain distinct', () => {
  assert.deepEqual(roleDefaults('api'), { OTEL_SERVICE_NAME: 'breadcrum-web', METRICS_PORT: 9091 })
  assert.deepEqual(roleDefaults('worker'), { OTEL_SERVICE_NAME: 'breadcrum-worker', METRICS_PORT: 9092 })
  assert.deepEqual(roleDefaults('all'), { OTEL_SERVICE_NAME: 'breadcrum-all', METRICS_PORT: 9091 })
})
