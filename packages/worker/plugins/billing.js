import fp from 'fastify-plugin'
import Stripe from 'stripe'

/**
 * @import { Stripe as StripeType } from 'stripe'
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

/**
 * @typedef {object} BillingClient
 * @property {'stripe'} provider
 * @property {StripeType} stripe
 */

export const billingEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    STRIPE_SECRET_KEY: { type: 'string', minLength: 1 },
  },
  required: ['STRIPE_SECRET_KEY'],
})

/**
 * Billing provider client for the worker process.
 * Initializes Stripe using STRIPE_SECRET_KEY.
 */
export default fp(async function (fastify, _) {
  /** @type {BillingClient} */
  const billing = {
    provider: 'stripe',
    stripe: new Stripe(fastify.config.STRIPE_SECRET_KEY),
  }

  fastify.decorate('billing', billing)
}, {
  name: 'billing',
  dependencies: ['env'],
})
