/// <reference lib="dom" />

const skippedViewTransitionMessage = 'Skipping view transition because skipTransition() was called.'

/**
 * @typedef {Object} SentryExceptionValue
 * @property {string} [type]
 * @property {string} [value]
 */

/**
 * @typedef {Object} SentryEvent
 * @property {{ values?: SentryExceptionValue[] }} [exception]
 */

/**
 * @typedef {Object} SentryEventHint
 * @property {unknown} [originalException]
 * @property {unknown} [syntheticException]
 */

/**
 * Safari can reject internal View Transition promises when a transition is
 * intentionally skipped during page restoration/navigation. This is browser
 * noise rather than an application failure.
 *
 * @param {SentryEvent} event
 * @param {SentryEventHint} [hint]
 * @returns {boolean}
 */
export function isSkippedViewTransitionAbortError (event, hint = {}) {
  if (isSkippedViewTransitionAbortException(hint.originalException)) return true
  if (isSkippedViewTransitionAbortException(hint.syntheticException)) return true

  return event.exception?.values?.some(value => (
    value.type === 'AbortError' &&
    typeof value.value === 'string' &&
    isSkippedViewTransitionMessage(value.value)
  )) === true
}

/**
 * @param {unknown} exception
 * @returns {boolean}
 */
function isSkippedViewTransitionAbortException (exception) {
  if (!exception || typeof exception !== 'object') return false

  const errorLike = /** @type {{ name?: unknown, message?: unknown }} */ (exception)

  return errorLike.name === 'AbortError' &&
    typeof errorLike.message === 'string' &&
    isSkippedViewTransitionMessage(errorLike.message)
}

/**
 * @param {string} message
 * @returns {boolean}
 */
function isSkippedViewTransitionMessage (message) {
  return message === skippedViewTransitionMessage ||
    message === `AbortError: ${skippedViewTransitionMessage}`
}
