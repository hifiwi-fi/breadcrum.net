import { getFeedUrl } from '../../feed-urls.js'
import { getFeedQuery } from '../feed-query.js'

export async function feedDetailsHandler ({
  fastify,
  request,
  reply,
  userId,
  feedId
}) {
  const query = getFeedQuery({
    ownerId: userId,
    feedId,
    perPage: 1
  })

  const results = await fastify.pg.query(query)
  const feed = results.rows.pop()

  if (!feed) {
    return reply.notFound('feed not found')
  }
  return {
    ...feed,
    feed_url: getFeedUrl({
      transport: fastify.config.TRANSPORT,
      host: fastify.config.HOST,
      userId,
      token: feed.token,
      feedId: feed.id
    })
  }
}
