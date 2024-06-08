import SQL from '@nearform/sql'
import { getFeedUrl } from '../../feed-urls.js'
import { getFeedQuery } from '../feed-query.js'
import { getFeedWithDefaults } from '../../feed-defaults.js'

export async function feedDetailsHandler ({
  fastify,
  request,
  reply,
  userId,
  feedId,
}) {
  const feedQuery = getFeedQuery({
    ownerId: userId,
    feedId,
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
