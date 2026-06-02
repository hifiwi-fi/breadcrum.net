/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { updateUser } from '../../api/user/user-actions.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function accountNewsletterRoutes (fastify) {
  fastify.post('/', {
    schema: {
      tags: ['html'],
    },
  }, async function postAccountNewsletterHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Account',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, '/login/?redirect=%2Faccount%2F')
    }

    const fields = request.body && typeof request.body === 'object'
      ? /** @type {Record<string, unknown>} */ (request.body)
      : {}
    const newsletterSubscription = stringField(fields['newsletter_subscription']) === 'true'

    await updateUser(fastify, {
      userId: context.user.id,
      user: { newsletter_subscription: newsletterSubscription },
    })

    return redirectForRequest(
      request,
      reply,
      `/account/?message=${encodeURIComponent(newsletterSubscription ? 'Newsletter subscribed.' : 'Newsletter unsubscribed.')}`
    )
  })
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  if (Array.isArray(value)) return String(value.at(-1) ?? '')
  if (value == null) return ''
  return String(value)
}
