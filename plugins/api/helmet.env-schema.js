/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const helmetEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SECURE_IFRAMES: { type: 'boolean', default: false },
  },
  required: [],
})
