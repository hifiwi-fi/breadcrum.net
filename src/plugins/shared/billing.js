import fp from 'fastify-plugin'
import Stripe from 'stripe'

/** @import { Stripe as StripeType } from 'stripe' */
export { billingEnvSchema } from './billing.env-schema.js'

/**
 * @typedef {object} BillingClient
 * @property {'stripe'} provider
 * @property {StripeType | null} stripe
 */


/**
 * Billing provider client for the worker process.
 * Initializes Stripe when STRIPE_SECRET_KEY is configured.
 */
export default fp(async function (fastify, _) {
  /** @type {BillingClient} */
  const billing = {
    provider: 'stripe',
    stripe: fastify.config.STRIPE_SECRET_KEY
      ? new Stripe(fastify.config.STRIPE_SECRET_KEY)
      : null,
  }

  fastify.decorate('billing', billing)
}, {
  name: 'billing',
  dependencies: ['env'],
})
