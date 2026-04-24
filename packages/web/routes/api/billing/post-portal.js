import { schemaBillingSession } from './schemas/schema-billing-session.js'
// Portal = Stripe Customer Portal session for managing billing (cancel, update payment method, etc.)
import { getStripeCustomerId } from '@breadcrum/resources/billing/billing-queries.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function postBillingPortal (fastify, _opts) {
  fastify.post(
    '/portal',
    {
      preHandler: fastify.auth([fastify.verifyJWT, fastify.notDisabled], {
        relation: 'and',
      }),
      schema: {
        tags: ['billing'],
        response: {
          200: schemaBillingSession,
        },
      },
    },
    async function postBillingPortalHandler (request, reply) {
      const { billing_enabled: billingEnabled } = await fastify.getFlags({
        frontend: true,
        backend: false,
      })

      if (!billingEnabled) {
        return reply.notFound()
      }

      const userId = request.user.id
      const customerId = await getStripeCustomerId({
        pg: fastify.pg,
        userId,
      })

      if (!customerId) {
        return reply.notFound('No billing customer found')
      }

      const returnUrl = `${fastify.config.TRANSPORT}://${fastify.config.HOST}/account/`

      const session = await fastify.billing.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      })

      if (!session.url) {
        return reply.internalServerError('Portal session missing URL.')
      }

      return reply.code(200).send({
        url: session.url,
      })
    }
  )
}
