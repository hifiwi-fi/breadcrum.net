/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const authEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    TURNSTILE_VALIDATE: {
      // TODO: Replace with a bypass token to allow tests against staging/prod.
      type: 'boolean',
      default: true,
    },
    TURNSTILE_SITEKEY: {
      type: 'string',
      default: '1x00000000000000000000AA',
    },
    TURNSTILE_SECRET_KEY: {
      type: 'string',
      default: '1x0000000000000000000000000000000AA',
    },
    PASSKEY_MAX_PER_USER: {
      type: 'integer',
      default: 10,
      minimum: 1,
      maximum: 100,
      description: 'Maximum number of passkeys allowed per user',
    },
    PASSKEY_CHALLENGE_TIMEOUT: {
      type: 'integer',
      default: 300000,
      description: 'Passkey challenge timeout in milliseconds (default: 5 minutes)',
    },
  },
  required: ['TURNSTILE_SECRET_KEY'],
})
