/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const jwtEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    JWT_SECRET: { type: 'string' },
  },
  required: ['JWT_SECRET'],
})
