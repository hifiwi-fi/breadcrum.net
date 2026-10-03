/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const pgEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    DATABASE_URL: { type: 'string', default: 'postgres://postgres@localhost/breadcrum' },
    // pg default: 0, disabled; fail fast when PgBouncer cannot be reached
    PG_CONNECTION_TIMEOUT_MS: { type: 'integer', default: 5000 },
    // pg default: 0; only used because keepAlive is enabled below
    PG_KEEP_ALIVE_INITIAL_DELAY_MS: { type: 'integer', default: 10000 },
  },
  required: [],
})
