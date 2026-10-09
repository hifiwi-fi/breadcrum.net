/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const swaggerEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SWAGGER: { type: 'boolean', default: true },
  },
  required: [],
})
