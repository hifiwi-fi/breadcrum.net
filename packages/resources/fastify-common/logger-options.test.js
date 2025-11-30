import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLoggerOptions } from './logger-options.js'

test('createLoggerOptions returns valid logger configuration', () => {
  const loggerOptions = createLoggerOptions({ serviceName: 'test-service' })

  assert.ok(loggerOptions, 'Logger options should be defined')
  assert.equal(typeof loggerOptions, 'object', 'Logger options should be an object')
  assert.equal(loggerOptions.messageKey, 'message', 'Message key should be "message"')
  assert.equal(typeof loggerOptions.mixin, 'function', 'Mixin should be a function')
  assert.ok(loggerOptions.formatters, 'Formatters should be defined')
  assert.equal(typeof loggerOptions.formatters.level, 'function', 'Level formatter should be a function')
})

test('mixin returns correct service name', () => {
  const serviceName = 'bc-web'
  const loggerOptions = createLoggerOptions({ serviceName })

  const mixinResult = loggerOptions.mixin()
  assert.deepEqual(mixinResult, { service: serviceName }, 'Mixin should return service name')
})

test('level formatter maps pino levels to severity', () => {
  const loggerOptions = createLoggerOptions({ serviceName: 'test-service' })
  const levelFormatter = loggerOptions.formatters.level

  const testCases = [
    { label: 'trace', number: 10, expected: 'DEBUG' },
    { label: 'debug', number: 20, expected: 'DEBUG' },
    { label: 'info', number: 30, expected: 'INFO' },
    { label: 'warn', number: 40, expected: 'WARNING' },
    { label: 'error', number: 50, expected: 'ERROR' },
    { label: 'fatal', number: 60, expected: 'CRITICAL' },
  ]

  for (const { label, number, expected } of testCases) {
    const result = levelFormatter(label, number)
    assert.equal(result.level, expected, `Level "${label}" should map to "${expected}"`)
    assert.equal(result.levelN, number, `Level number should be ${number}`)
  }
})

test('level formatter handles unknown levels with default', () => {
  const loggerOptions = createLoggerOptions({ serviceName: 'test-service' })
  const levelFormatter = loggerOptions.formatters.level

  const result = levelFormatter('unknown', 99)
  assert.equal(result.level, 'INFO', 'Unknown level should default to INFO')
  assert.equal(result.levelN, 99, 'Level number should be preserved')
})

test('createLoggerOptions works with different service names', () => {
  const webOptions = createLoggerOptions({ serviceName: 'bc-web' })
  const workerOptions = createLoggerOptions({ serviceName: 'bc-worker' })

  assert.equal(webOptions.mixin().service, 'bc-web')
  assert.equal(workerOptions.mixin().service, 'bc-worker')
})
