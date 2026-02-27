/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { Stripe } from 'stripe'
 */

/** @type {Set<Stripe.Event.Type>} */
const allowedEvents = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.payment_succeeded',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
])

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export default async function billingWebhookRoute (fastify, _opts) {
  fastify.post(
    '/',
    {
      schema: {
        tags: ['billing'],
        hide: true,
        response: {
          200: {
            type: 'object',
            properties: {
              received: { type: 'boolean' },
            },
          },
        },
      },
    },
    async function postBillingWebhookHandler (request, reply) {
      const requestWithRawBody = /** @type {typeof request & { rawBody?: Buffer }} */ (request)
      const { billing_enabled: billingEnabled } = await fastify.getFlags({
        frontend: true,
        backend: false,
      })

      if (!billingEnabled) {
        return reply.notFound()
      }

      const signature = request.headers['stripe-signature']
      if (!signature || Array.isArray(signature)) {
        return reply.badRequest('Missing stripe signature')
      }

      if (!fastify.config.STRIPE_WEBHOOK_SECRET) {
        return reply.internalServerError('Stripe webhook secret not configured')
      }

      if (!requestWithRawBody.rawBody) {
        return reply.badRequest('Missing raw request body')
      }

      /** @type {Stripe.Event} */
      let event
      try {
        event = fastify.billing.stripe.webhooks.constructEvent(
          requestWithRawBody.rawBody,
          signature,
          fastify.config.STRIPE_WEBHOOK_SECRET
        )
      } catch (err) {
        request.log.warn({ err }, 'Stripe webhook signature verification failed')
        return reply.badRequest('Invalid signature')
      }

      if (allowedEvents.has(event.type)) {
        const obj = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (event.data.object))
        const customerId = typeof obj['customer'] === 'string'
          ? obj['customer']
          : null

        if (customerId) {
          // Queue wrapper uses sendThrottled(customerId) for retry/idempotency burst control.
          await fastify.pgboss.queues.syncSubscriptionQ.send({
            data: { customerId },
          })
        } else {
          // Intentional: return 200 even when customerId is missing so webhook delivery
          // does not retry indefinitely on malformed/unmappable events.
          request.log.warn({ eventId: event.id, eventType: event.type }, 'Webhook event missing customer ID')
        }
      }

      // Async payment outcome emails are handled by Stripe customer email settings.
      return reply.code(200).send({ received: true })
    }
  )
}
