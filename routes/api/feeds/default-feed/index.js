import { getOrCreateDefaultFeed } from './get-or-create-default-feed-query.js'
import { getFeedQuery } from '../_feed/get-feed-query.js'
import { getFeedUrl } from '../get-feed-url.js'

export default async function defaultFeedRoutes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri'
                  },
                  json: {
                    type: 'string',
                    format: 'uri'
                  }
                }
              }
            }
          }
        }
      }
    },
    async function getDefaultFeedHandler (request, reply) {
      const userId = request.user.id

      const feedId = await getOrCreateDefaultFeed({ userId, client: fastify.pg })

      const feedQuery = getFeedQuery({
        feedId,
        ownerId: userId
      })

      const feedResults = await fastify.pg.query(feedQuery)

      const pf = feedResults.rows.pop()
      if (!pf) {
        return reply.notFound(`podcast feed ${feedId} not found`)
      }

      const feedURL = getFeedUrl({
        transport: fastify.config.TRANSPORT,
        host: fastify.config.HOST,
        userId,
        token: pf.token,
        feedId: pf.id
      })

      return {
        data: {
          url: feedURL,
          json: `${feedURL}?format=json`
        }
      }
    }
  )
}
