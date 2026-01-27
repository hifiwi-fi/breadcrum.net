/** @import { JSONSchema } from 'json-schema-to-ts' */

export const billingEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    STRIPE_SECRET_KEY: { type: 'string', minLength: 1 },
    STRIPE_WEBHOOK_SECRET: { type: 'string', minLength: 1 },
    STRIPE_PRICE_LOOKUP_KEY: { type: 'string', minLength: 1, default: 'yearly_paid' },
  },
  required: [],
})
