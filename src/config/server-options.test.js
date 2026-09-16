import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createCliOptions } from './server-options.js'
import { options as apiOptions } from '#api/app.js'
import { options as workerOptions } from '#worker/app.js'

const rootEnvPath = fileURLToPath(new URL('../../.env', import.meta.url))

test('shared CLI defaults preserve each role and the root environment path', () => {
  for (const role of /** @type {const} */ (['api', 'worker', 'all'])) {
    const options = createCliOptions(role)
    assert.equal(options.role, role)
    assert.equal(options.dotEnvPath, rootEnvPath)
    assert.equal(options.trustProxy, true)
    assert.equal(options.pluginTimeout, 40_000)
    assert.equal(options.disableRequestLogging, role === 'worker' ? true : undefined)
    assert.equal(typeof options.genReqId, 'function')
    assert.equal(typeof options.logger, 'object')
  }
})

test('API and worker inspection entrypoints use the shared configuration', () => {
  assert.equal(apiOptions.role, 'api')
  assert.equal(workerOptions.role, 'worker')
  assert.equal(apiOptions.dotEnvPath, rootEnvPath)
  assert.equal(workerOptions.dotEnvPath, rootEnvPath)
  assert.equal(apiOptions.disableRequestLogging, undefined)
  assert.equal(workerOptions.disableRequestLogging, true)
})
