import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shouldHandleSentryError } from './sentry-error-filter.js'

test('shouldHandleSentryError ignores explicit 4xx errors', () => {
  const error = Object.assign(new Error('not found'), { statusCode: 404 })

  assert.equal(shouldHandleSentryError(error, 200), false)
})

test('shouldHandleSentryError captures explicit 5xx errors', () => {
  const error = Object.assign(new Error('server error'), { statusCode: 500 })

  assert.equal(shouldHandleSentryError(error, 200), true)
})

test('shouldHandleSentryError ignores Fastify validation errors before reply status is assigned', () => {
  const error = Object.assign(new Error('params/feed must match format "uuid"'), {
    code: 'FST_ERR_VALIDATION',
    validation: [{ instancePath: '/feed' }],
    validationContext: 'params',
  })

  assert.equal(shouldHandleSentryError(error, 200), false)
})

test('shouldHandleSentryError ignores exposed http-errors before reply status is assigned', () => {
  const error = Object.assign(new Error('Forbidden'), {
    name: 'ForbiddenError',
    expose: true,
  })

  assert.equal(shouldHandleSentryError(error, 200), false)
})

test('shouldHandleSentryError ignores known 4xx http-error names before reply status is assigned', () => {
  const error = new Error('Bad Request')
  error.name = 'BadRequestError'

  assert.equal(shouldHandleSentryError(error, 200), false)
})

test('shouldHandleSentryError captures unknown errors while reply is still 2xx', () => {
  const error = new Error('unexpected failure')

  assert.equal(shouldHandleSentryError(error, 200), true)
})

test('shouldHandleSentryError ignores unknown errors with finalized 4xx replies', () => {
  const error = new Error('handled by route')

  assert.equal(shouldHandleSentryError(error, 404), false)
})
