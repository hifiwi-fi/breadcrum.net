import fp from 'fastify-plugin'

import { schemaBillingSession } from './schema-billing-session.js'
import { schemaBillingSubscriptionRead } from './schema-billing-subscription-read.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaBillingSession)
  fastify.addSchema(schemaBillingSubscriptionRead)
}, {
  name: 'billing.schema',
  dependencies: [],
})
