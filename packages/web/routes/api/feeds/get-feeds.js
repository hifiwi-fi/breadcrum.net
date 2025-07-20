import { getOrCreateDefaultFeed } from '@breadcrum/resources/feeds/default-feed-query.js'
import { feedProps, feedReadProps } from './schemas/feed-base.js'
import { getFeedsQuery } from './feeds-query.js'
import { getFeedWithDefaults } from './feed-defaults.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *  SerializerSchemaOptions: {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *  }
 * }>}
 * @returns {Promise<void>}
 */
export async function getFeeds (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['feeds'],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ...feedProps.properties,
                    ...feedReadProps.properties,
                    default_feed: { type: 'boolean' },
                    episode_count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async function getFeedsHandler (request, _reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        // Ensure default feed exists
        await getOrCreateDefaultFeed({ userId, client })

        const feedsQuery = getFeedsQuery({ userId })

        const [feedsResults] = await Promise.all([
          client.query(feedsQuery),
        ])

        const transport = fastify.config.TRANSPORT
        const host = fastify.config.HOST

        const resultsWithDefaults = feedsResults.rows.map(feed => getFeedWithDefaults({ feed, transport, host }))

        return {
          data: resultsWithDefaults,
        }
      })
    })
}
