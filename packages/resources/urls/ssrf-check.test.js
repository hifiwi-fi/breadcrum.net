import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNotSSRF } from './ssrf-check.js'

/** @import { FastifyBaseLogger } from 'fastify' */

test('isNotSSRF logs validation failures through the provided logger', async () => {
  /** @type {Array<{obj: unknown, message: string}>} */
  const warnings = []
  const logger = /** @type {FastifyBaseLogger} */ (/** @type {unknown} */ ({
    warn (/** @type {unknown} */ obj, /** @type {string} */ message) {
      warnings.push({ obj, message })
    },
  }))

  const result = await isNotSSRF('not a URL', logger)

  assert.equal(result, false)
  assert.equal(warnings.length, 1)
  assert.equal(warnings[0]?.message, 'URL failed SSRF validation')
  assert.ok(warnings[0]?.obj && typeof warnings[0].obj === 'object')
})
