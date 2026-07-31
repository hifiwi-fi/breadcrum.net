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

test('redacts sensitive URL data while preserving YouTube video IDs', () => {
  const loggerOptions = createLoggerOptions({ serviceName: 'test-service' })
  const censor = loggerOptions.redact.censor

  assert.equal(censor(null), null)
  assert.equal(censor(undefined), undefined)
  assert.equal(censor({ query: 'secret' }), '[Redacted]')
  assert.equal(
    censor('https://user:password@cdn.example.com/audio.mp3?Signature=secret#token'),
    'https://cdn.example.com/audio.mp3'
  )
  assert.equal(
    censor('https://www.youtube.com/watch?v=abc123&si=secret'),
    'https://www.youtube.com/watch?v=abc123'
  )
  assert.equal(
    censor('/unified?url=https%3A%2F%2Fcdn.example.com%2Fa.mp3%3FSignature%3Dsecret'),
    '/unified'
  )
  assert.equal(
    censor('Unable to download https://cdn.example.com/audio.mp3?Signature=secret HTTP 403'),
    'Unable to download https://cdn.example.com/audio.mp3 HTTP 403'
  )
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
