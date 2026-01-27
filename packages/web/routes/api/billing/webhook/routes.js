/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { FastifyInstance, FastifyRequest } from 'fastify'
 * @import { Stripe } from 'stripe'
 */
import { getUserBillingProfile, getUserIdByStripeCustomerId } from '@breadcrum/resources/billing/billing-queries.js'

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

      if (!request.rawBody) {
        return reply.badRequest('Missing raw request body')
      }

      /** @type {Stripe.Event} */
      let event
      try {
        event = fastify.billing.stripe.webhooks.constructEvent(
          request.rawBody,
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
          await fastify.pgboss.queues.syncSubscriptionQ.send({
            data: { customerId },
          })

          await maybeSendAsyncCheckoutEmail({
            fastify,
            request,
            event,
            customerId,
          })
        } else {
          request.log.warn({ eventId: event.id, eventType: event.type }, 'Webhook event missing customer ID')
        }
      }

      return reply.code(200).send({ received: true })
    }
  )
}

/**
 * Sends transactional email for async Checkout payment outcomes.
 * Keeps entitlement state handling webhook/sync-driven.
 *
 * @param {object} params
 * @param {FastifyInstance} params.fastify
 * @param {FastifyRequest} params.request
 * @param {Stripe.Event} params.event
 * @param {string} params.customerId
 * @returns {Promise<void>}
 */
async function maybeSendAsyncCheckoutEmail ({ fastify, request, event, customerId }) {
  const isAsyncSuccess = event.type === 'checkout.session.async_payment_succeeded'
  const isAsyncFailure = event.type === 'checkout.session.async_payment_failed'

  if (!isAsyncSuccess && !isAsyncFailure) return

  const sessionObject = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (event.data.object))
  const mode = sessionObject['mode']
  if (mode !== 'subscription') return

  const userId = await getUserIdByStripeCustomerId({
    pg: fastify.pg,
    stripeCustomerId: customerId,
  })

  if (!userId) {
    request.log.warn({ eventId: event.id, customerId }, 'No user mapping found for async checkout event')
    return
  }

  const profile = await getUserBillingProfile({
    pg: fastify.pg,
    userId,
  })

  if (!profile?.email) {
    request.log.warn({ eventId: event.id, userId }, 'No email found for async checkout event')
    return
  }

  const accountUrl = `${fastify.config.TRANSPORT}://${fastify.config.HOST}/account/`

  const subject = isAsyncSuccess
    ? 'Your Breadcrum subscription payment settled'
    : 'Breadcrum subscription payment failed'

  const text = isAsyncSuccess
    ? [
        `Hi ${profile.username},`,
        '',
        'Your delayed payment has settled successfully.',
        'Your paid subscription access is now active.',
        '',
        `Review your billing details: ${accountUrl}`,
      ].join('\n')
    : [
        `Hi ${profile.username},`,
        '',
        'Your delayed payment did not complete, so your subscription was not activated.',
        'Please update your payment method and try again.',
        '',
        `Manage billing: ${accountUrl}`,
      ].join('\n')

  await fastify.sendEmail({
    toEmail: profile.email,
    subject,
    text,
    includeUnsubscribe: false,
  })
}
