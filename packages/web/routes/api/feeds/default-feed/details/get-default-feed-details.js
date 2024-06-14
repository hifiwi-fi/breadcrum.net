import { fullFeedProps } from '../../feed-props.js'
import { getOrCreateDefaultFeed } from '../default-feed-query.js'
import { feedDetailsHandler } from '../../_feed/details/feed-details-handler.js'

export async function getDefaultFeedDetails (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: {
        tags: ['feeds'],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  ...fullFeedProps,
                },
              },
            },
          },
        },
      },
    },

    async function getDefaultFeedDetailsHandler (request, reply) {
      const userId = request.user.id
      const feedId = await getOrCreateDefaultFeed({ userId, client: fastify.pg })

      return await feedDetailsHandler({
        fastify,
        request,
        reply,
        userId,
        feedId,
      })
    })
}
