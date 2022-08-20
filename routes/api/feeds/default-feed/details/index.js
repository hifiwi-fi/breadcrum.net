/* eslint-disable camelcase */
import { fullFeedProps } from '../../feed-props.js'
import { getFeedQuery } from '../../_feed/get-feed-query.js'
import { getOrCreateDefaultFeed } from '../get-or-create-default-feed-query.js'
import { getFeedUrl } from '../../get-feed-url.js'

export default async function getDefaultFeedDetails (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              ...fullFeedProps
            }
          }
        }
      }
    },

    async function getDefaultFeedDetailsHandler (request, reply) {
      const userId = request.user.id
      const feedId = await getOrCreateDefaultFeed({ userId, client: fastify.pg })

      const query = getFeedQuery({
        ownerId: userId,
        feedId,
        perPage: 1
      })

      const results = await fastify.pg.query(query)

      console.dir({ results, query }, { colors: true, depth: 999 })
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
    })
}
