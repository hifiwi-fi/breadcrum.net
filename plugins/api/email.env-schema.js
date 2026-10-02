/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const emailEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    EMAIL_SENDING: { type: 'boolean', default: true },
    EMAIL_VALIDATION: { type: 'boolean', default: true },
    SMTP_HOST: { type: 'string' },
    SMTP_PORT: { type: 'integer', default: 465 },
    SMTP_SECURE: { type: 'boolean', default: true },
    SMTP_USER: { type: 'string' },
    SMTP_PASS: { type: 'string' },
    APP_EMAIL: { type: 'string', default: 'support@breadcrum.net' },
    SNS_USER: { type: 'string', default: 'sns-user' },
    SNS_PASS: { type: 'string' },
  },
  required: [],
})
