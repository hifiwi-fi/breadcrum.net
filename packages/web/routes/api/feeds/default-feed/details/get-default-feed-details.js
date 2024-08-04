import { feedProps, feedReadProps } from '../../schemas/feed-base.js'
import { getOrCreateDefaultFeed } from '../default-feed-query.js'
import { feedDetailsHandler } from '../../_feed/details/feed-details-handler.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getDefaultFeedDetails (fastify, _opts) {
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
                  ...feedProps.properties,
                  ...feedReadProps.properties
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
