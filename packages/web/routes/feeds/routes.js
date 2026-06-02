/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { getDefaultFeedDetails, getFeedDetailsById, listFeeds } from '../api/feeds/feed-actions.js'
import { feedEditFormFromFeed, feedsPage } from './view.js'

const feedsTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function feedsRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function getFeedsHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Feeds',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const url = new URL(request.url, 'https://breadcrum.invalid')
    const feedId = url.searchParams.get('feed_id') ?? url.searchParams.get('id')
    const feed = feedId
      ? await getFeedDetailsById(fastify, { userId: context.user.id, feedId })
      : await getDefaultFeedDetails(fastify, { userId: context.user.id })

    if (!feed) reply.status(404)

    const edit = feed ? url.searchParams.get('edit') === 'true' : false
    const body = await reply.render(feedsPage, {
      ...context,
      title: feed?.title ?? 'Feeds',
      feedsPage: {
        feeds: await listFeeds(fastify, { userId: context.user.id }),
        feed,
        edit,
        editForm: feed && edit ? feedEditFormFromFeed(feed) : null,
        error: feed ? null : 'Feed not found.',
      },
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, feedsTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/feeds/'))
  return `/login/?redirect=${redirect}`
}
