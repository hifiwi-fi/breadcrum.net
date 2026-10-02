import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRoleFromEnvironment, roleDefaults } from './role.js'

test('environment requires an explicit supported APP_ROLE', () => {
  for (const APP_ROLE of ['all', 'api', 'worker']) {
    assert.equal(parseRoleFromEnvironment({ APP_ROLE }), APP_ROLE)
  }
  for (const APP_ROLE of [undefined, '', 'web', 'API', ' worker', 'worker ', '--role=api']) {
    assert.throws(() => parseRoleFromEnvironment({ APP_ROLE }), /APP_ROLE is required and must be api, worker, or all/)
  }
})

test('either production environment marker rejects combined mode', () => {
  for (const environment of [
    { NODE_ENV: 'production' },
    { ENV: 'production' },
    { NODE_ENV: 'production', ENV: 'development' },
    { NODE_ENV: 'development', ENV: 'production' },
    { NODE_ENV: 'production', ENV: 'production' },
  ]) {
    assert.throws(() => parseRoleFromEnvironment({ ...environment, APP_ROLE: 'all' }), /APP_ROLE=all is not allowed in production/)
    for (const APP_ROLE of ['api', 'worker']) {
      assert.equal(parseRoleFromEnvironment({ ...environment, APP_ROLE }), APP_ROLE)
    }
  }
  assert.equal(parseRoleFromEnvironment({ APP_ROLE: 'all', NODE_ENV: 'test', ENV: 'development' }), 'all')
})

test('production role identities and metrics ports remain distinct', () => {
  assert.deepEqual(roleDefaults('api'), { OTEL_SERVICE_NAME: 'breadcrum-web', METRICS_PORT: 9091 })
  assert.deepEqual(roleDefaults('worker'), { OTEL_SERVICE_NAME: 'breadcrum-worker', METRICS_PORT: 9092 })
  assert.deepEqual(roleDefaults('all'), { OTEL_SERVICE_NAME: 'breadcrum-all', METRICS_PORT: 9091 })
})
