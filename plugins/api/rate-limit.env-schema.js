/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const rateLimitEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    RATE_LIMITING: { type: 'boolean', default: true },
  },
  required: [],
})
