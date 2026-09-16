import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import { isSkippedViewTransitionAbortError } from './sentry-filters.js'

suite('Sentry filters', () => {
  test('filters skipped View Transition AbortErrors from Sentry event exceptions', () => {
    assert.equal(isSkippedViewTransitionAbortError({
      exception: {
        values: [{
          type: 'AbortError',
          value: 'Skipping view transition because skipTransition() was called.',
        }],
      },
    }), true)
  })

  test('filters skipped View Transition AbortErrors from Sentry hint exceptions', () => {
    assert.equal(isSkippedViewTransitionAbortError({}, {
      originalException: new DOMException(
        'Skipping view transition because skipTransition() was called.',
        'AbortError'
      ),
    }), true)
  })

  test('keeps unrelated AbortErrors', () => {
    assert.equal(isSkippedViewTransitionAbortError({
      exception: {
        values: [{
          type: 'AbortError',
          value: 'The operation was aborted.',
        }],
      },
    }), false)
  })

  test('keeps non-AbortErrors with the same message', () => {
    assert.equal(isSkippedViewTransitionAbortError({
      exception: {
        values: [{
          type: 'Error',
          value: 'Skipping view transition because skipTransition() was called.',
        }],
      },
    }), false)
  })
})
