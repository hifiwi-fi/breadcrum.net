/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const geoipEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    MAXMIND_ACCOUNT_ID: { type: 'string' },
    MAXMIND_LICENSE_KEY: { type: 'string' },
  },
  required: [],
})
