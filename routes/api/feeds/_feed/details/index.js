/* eslint-disable camelcase */
import { fullFeedProps } from '../../feed-props.js'
import { getFeedQuery } from '../get-feed-query.js'
import { getFeedUrl } from '../../get-feed-url.js'

export default async function getFeedDetails (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        parms: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid'
            }
          },
          required: ['feed']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ...fullFeedProps
                  }
                }
              }
            }
          }
        }
      }
    },

    async function getFeedHandler (request, reply) {
      const userId = request.user.id
      const { feed: feedId } = request.params

      const query = getFeedQuery({
        ownerId: userId,
        feedId,
        perPage: 1
      })

      const results = await fastify.pg.query(query)
      const feed = results.rows[0]
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
