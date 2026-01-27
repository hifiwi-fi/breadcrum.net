import { getBillingSubscription } from './get-subscription.js'
import { postBillingCheckout } from './post-checkout.js'
import { postBillingPortal } from './post-portal.js'
import { postBillingSync } from './post-sync.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function billingRoutes (fastify, opts) {
  await Promise.all([
    getBillingSubscription(fastify, opts),
    postBillingCheckout(fastify, opts),
    postBillingPortal(fastify, opts),
    postBillingSync(fastify, opts),
  ])
}
