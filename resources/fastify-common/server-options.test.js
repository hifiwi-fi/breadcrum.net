import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServerOptions } from './server-options.js'
import Fastify from 'fastify'

for (const logLevel of /** @type {const} */ (['debug', 'warn'])) {
  test(`server options configure the actual Pino logger at ${logLevel}`, async t => {
    const options = createServerOptions({ serviceName: 'test-service', logLevel })
    assert.ok(typeof options.logger === 'object')
    /** @type {string[]} */
    const lines = []
    const app = Fastify({
      ...options,
      logger: { ...options.logger, stream: { write (line) { lines.push(line) } } },
    })
    t.after(() => app.close())
    assert.equal(app.log.level, logLevel)
    app.log.debug('debug message')
    app.log.info('info message')
    app.log.warn('warn message')
    const messages = lines.map(line => JSON.parse(line).message)
    assert.deepEqual(messages, logLevel === 'debug' ? ['debug message', 'info message', 'warn message'] : ['warn message'])
  })
}

test('createServerOptions returns valid server configuration', () => {
  const serverOptions = createServerOptions({
    serviceName: 'test-service',
  })

  assert.ok(serverOptions, 'Server options should be defined')
  assert.equal(typeof serverOptions, 'object', 'Server options should be an object')
  assert.equal(serverOptions.trustProxy, true, 'trustProxy should be true')
  assert.equal(typeof serverOptions.genReqId, 'function', 'genReqId should be a function')
  assert.ok(serverOptions.logger, 'Logger should be defined')
})

test('disableRequestLogging defaults to false (not present)', () => {
  const serverOptions = createServerOptions({
    serviceName: 'test-service',
  })

  assert.equal(serverOptions.disableRequestLogging, undefined, 'disableRequestLogging should not be present by default')
})

test('disableRequestLogging can be explicitly set to true', () => {
  const serverOptions = createServerOptions({
    serviceName: 'test-service',
    disableRequestLogging: true,
  })

  assert.equal(serverOptions.disableRequestLogging, true, 'disableRequestLogging should be true when specified')
})

test('disableRequestLogging can be explicitly set to false', () => {
  const serverOptions = createServerOptions({
    serviceName: 'test-service',
    disableRequestLogging: false,
  })

  assert.equal(serverOptions.disableRequestLogging, undefined, 'disableRequestLogging should not be present when false')
})

test('logger uses correct service name', () => {
  const serviceName = 'bc-web'
  const serverOptions = createServerOptions({
    serviceName,
  })

  assert.ok(serverOptions.logger, 'Logger should be defined')
  assert.equal(typeof serverOptions.logger, 'object', 'Logger should be an object')
})

test('createServerOptions works with different service names', () => {
  const webOptions = createServerOptions({
    serviceName: 'bc-web',
  })

  const workerOptions = createServerOptions({
    serviceName: 'bc-worker',
    disableRequestLogging: true,
  })

  assert.equal(webOptions.disableRequestLogging, undefined)

  assert.equal(workerOptions.disableRequestLogging, true)
})
