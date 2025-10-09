import SQL from '@nearform/sql'
import { getFeedUrl } from '../../feed-urls.js'
import { getFeedQuery } from '../feed-query.js'
import { getFeedWithDefaults } from '../../feed-defaults.js'

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
  const feedQuery = getFeedQuery({
    ownerId: userId,
    feedId,
    // @ts-expect-error - perPage is not in the expected type
    perPage: 1,
  })

  const userQuery = SQL`
    select username
    from users
    where id = ${userId}
    fetch first row only`

  const [feedResults, userResults] = await Promise.all([
    fastify.pg.query(feedQuery),
    fastify.pg.query(userQuery),
  ])

  const feed = feedResults.rows.pop()
  const { username: ownerName } = userResults.rows.pop()

  if (!feed) {
    return reply.notFound('feed not found')
  }

  const transport = fastify.config.TRANSPORT
  const host = fastify.config.HOST

  return {
    data: {
      // TODO: Fix any
      // @ts-expect-error - ownerName is not in the expected type
      ...getFeedWithDefaults({ feed, ownerName, transport, host }),
      feed_url: getFeedUrl({
        transport,
        host,
        userId,
        token: feed.token,
        feedId: feed.id,
      }),
    },
  }
}
