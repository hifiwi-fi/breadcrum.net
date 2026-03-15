import SQL from '@nearform/sql'
import { getStripeCustomerId } from '@breadcrum/resources/billing/billing-queries.js'

/**
 * @import { Stripe } from 'stripe'
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function deleteAdminUser (fastify, _opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    // DELETE user as an admin
    async function deleteAdminUserHandler (request, reply) {
      const userId = request.user.id
      const { id: targetUserId } = request.params

      if (userId === targetUserId) {
        return reply.conflict('You can\'t delete yourself this way')
      }

      // Cancel Stripe resources before deleting user.
      // DB cascade removes local rows, but Stripe would otherwise keep billing.
      if (fastify.billing?.stripe) {
        const customerId = await getStripeCustomerId({
          pg: fastify.pg,
          userId: targetUserId,
        })

        if (customerId) {
          try {
            await cancelAllStripeSubscriptions({
              stripe: fastify.billing.stripe,
              customerId,
            })
          } catch (err) {
            if (!isStripeResourceMissingError(err)) {
              request.log.error({ err, targetUserId, customerId }, 'Failed to cancel Stripe subscriptions during user deletion')
              throw err
            }
            request.log.info({ targetUserId, customerId }, 'Stripe customer missing while canceling subscriptions; continuing user deletion')
          }

          try {
            await fastify.billing.stripe.customers.del(customerId)
          } catch (err) {
            if (!isStripeResourceMissingError(err)) {
              request.log.error({ err, targetUserId, customerId }, 'Failed to delete Stripe customer during user deletion')
              throw err
            }
            request.log.info({ targetUserId, customerId }, 'Stripe customer already deleted; continuing user deletion')
          }
        }
      }

      const query = SQL`
        DELETE from users
        WHERE id = ${targetUserId};
      `

      await fastify.pg.query(query)

      return {
        status: 'ok',
      }
    }
  )
}

/**
 * @param {object} params
 * @param {Stripe} params.stripe
 * @param {string} params.customerId
 * @returns {Promise<void>}
 */
async function cancelAllStripeSubscriptions ({ stripe, customerId }) {
  /** @type {string | undefined} */
  let startingAfter

  while (true) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const subscription of page.data) {
      if (subscription.status === 'canceled') continue

      try {
        await stripe.subscriptions.cancel(subscription.id)
      } catch (err) {
        if (!isStripeResourceMissingError(err)) throw err
      }
    }

    if (!page.has_more || page.data.length < 1) return
    startingAfter = page.data[page.data.length - 1]?.id
    if (!startingAfter) return
  }
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isStripeResourceMissingError (err) {
  if (!err || typeof err !== 'object') return false

  const stripeErr = /** @type {{ type?: unknown, code?: unknown, raw?: { code?: unknown } }} */ (err)
  return stripeErr.type === 'StripeInvalidRequestError' &&
    (stripeErr.code === 'resource_missing' || stripeErr.raw?.code === 'resource_missing')
}
