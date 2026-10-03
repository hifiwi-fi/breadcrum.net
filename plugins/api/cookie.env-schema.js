/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const cookieEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    COOKIE_SECRET: { type: 'string' },
    COOKIE_NAME: { type: 'string', default: 'breadcrum_token' },
  },
  required: ['COOKIE_SECRET'],
})
