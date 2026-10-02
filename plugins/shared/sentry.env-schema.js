/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const sentryEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SENTRY_DSN: { type: 'string' },
    SENTRY_API_DSN: { type: 'string' },
    SENTRY_WORKER_DSN: { type: 'string' },
    SENTRY_BROWSER_DSN: { type: 'string' },
    SENTRY_RELEASE: { type: 'string' },
  },
  required: [],
})
