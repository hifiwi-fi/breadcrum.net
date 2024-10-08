import SQL from '@nearform/sql'
import { getOrCreateDefaultFeed } from './default-feed/default-feed-query.js'
import { fullFeedProps } from './feed-props.js'
import { getFeedsQuery } from './feeds-query.js'
import { getFeedWithDefaults } from './feed-defaults.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
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
                    ...fullFeedProps,
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
    async function getFeedsHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        // Ensure default feed exists
        await getOrCreateDefaultFeed({ userId, client })

        const feedsQuery = getFeedsQuery({ userId })
        const userQuery = SQL`
          select username
          from users
          where id = ${userId}
          fetch first row only`

        const [feedsResults, userResults] = await Promise.all([
          client.query(feedsQuery),
          client.query(userQuery),
        ])

        const { username: ownerName } = userResults.rows.pop()

        const transport = fastify.config.TRANSPORT
        const host = fastify.config.HOST

        const resultsWithDefaults = feedsResults.rows.map(feed => getFeedWithDefaults({ feed, ownerName, transport, host }))

        return {
          data: resultsWithDefaults,
        }
      })
    })
}
