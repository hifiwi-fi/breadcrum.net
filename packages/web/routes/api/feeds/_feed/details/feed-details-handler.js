import { getFeedDetailsById } from '../../feed-actions.js'

/**
 * @import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
 */

/**
 * Handles feed details requests
 * @param {Object} params
 * @param {FastifyInstance} params.fastify
 * @param {FastifyRequest} params.request - Fastify request object (unused)
 * @param {FastifyReply} params.reply
 * @param {string} params.userId
 * @param {string} params.feedId
 */
export async function feedDetailsHandler ({
  fastify,
  request: _request,
  reply,
  userId,
  feedId,
}) {
  const feed = await getFeedDetailsById(fastify, { userId, feedId })

  if (!feed) {
    return reply.notFound('feed not found')
  }

  return {
    data: /** @type {any} */ (feed),
  }
}
