import fp from 'fastify-plugin'
import Stripe from 'stripe'

/**
 * @import { Stripe as StripeType } from 'stripe'
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

/**
 * @typedef {object} BillingClient
 * @property {StripeType} stripe
 */

export const billingEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    STRIPE_SECRET_KEY: { type: 'string' },
    STRIPE_WEBHOOK_SECRET: { type: 'string' },
    STRIPE_PRICE_LOOKUP_KEY: { type: 'string', default: 'yearly_paid' },
  },
  required: ['STRIPE_SECRET_KEY'],
})

/**
 * Billing provider client. Initializes Stripe using STRIPE_SECRET_KEY.
 * Route-level access is controlled by the billing_enabled backend feature flag.
 */
export default fp(async function (fastify, _) {
  /** @type {BillingClient} */
  const billing = {
    stripe: new Stripe(fastify.config.STRIPE_SECRET_KEY),
  }

  fastify.decorate('billing', billing)
}, {
  name: 'billing',
  dependencies: ['env'],
})
