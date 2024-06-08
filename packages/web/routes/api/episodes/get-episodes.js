import { fullEpisodePropsWithBookmarkAndFeed } from './mixed-episode-props.js'
import { getOrCreateDefaultFeed } from '../feeds/default-feed/default-feed-query.js'
import { getEpisodesQuery } from './episode-query-get.js'
import { getFeedWithDefaults } from '../feeds/feed-defaults.js'
import { addMillisecond } from '../bookmarks/addMillisecond.js'

export async function getEpisodes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            before: {
              type: 'string',
              format: 'date-time',
            },
            after: {
              type: 'string',
              format: 'date-time',
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 20,
            },
            sensitive: {
              type: 'boolean',
              default: false,
            },
            feed_id: {
              type: 'string',
              format: 'uri',
            },
            bookmark_id: {
              type: 'string',
              format: 'uuid',
            },
            default_feed: {
              type: 'boolean',
              default: false,
            },
            include_feed: {
              type: 'boolean',
              default: false,
            },
            ready: {
              type: 'boolean',
            },
          },
          dependencies: {
            before: { allOf: [{ not: { required: ['after', 'url'] } }] },
            after: { allOf: [{ not: { required: ['before', 'url'] } }] },
            feed_id: { allOf: [{ not: { required: ['default_feed'] } }] },
            default_feed: { allOf: [{ not: { required: ['feed_id'] } }] },
          },
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
                    ...fullEpisodePropsWithBookmarkAndFeed,
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  before: { type: 'string', format: 'date-time' },
                  after: { type: 'string', format: 'date-time' },
                  top: { type: 'boolean' },
                  bottom: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async function getEpisodesHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        const {
          before,
          after,
          per_page: perPage,
          sensitive,
          bookmark_id: bookmarkId,
          ready,
        } = request.query

        const feedId = request.query.feed_id ?? request.query.default_feed
          ? await getOrCreateDefaultFeed({ client, userId })
          : null

        const episodeQuery = getEpisodesQuery({
          ownerId: userId,
          before,
          after,
          sensitive,
          ready,
          perPage: perPage + 1,
          feedId,
          bookmarkId,
          includeFeed: request.query.include_feed,
        })

        const results = await fastify.pg.query(episodeQuery)

        const top = Boolean(
          (!before && !after) ||
          (after && results.rows.length <= perPage)
        )
        const bottom = Boolean(
          (before && results.rows.length <= perPage) ||
          (!before && !after && results.rows.length <= perPage)
        )

        if (results.rows.length > perPage) {
          if (after) {
            results.rows.shift()
          } else {
            results.rows.pop()
          }
        }

        const nextPage = bottom ? null : results.rows.at(-1)?.created_at
        const prevPage = top ? null : addMillisecond(results.rows[0]?.created_at)

        return {
          data: request.query.include_feed
            ? results.rows.map(episode => {
              episode.podcast_feed = getFeedWithDefaults({
                feed: episode.podcast_feed,
                transport: fastify.config.TRANSPORT,
                host: fastify.config.HOST,
              })
              return episode
            })
            : results.rows,
          pagination: {
            before: nextPage,
            after: prevPage,
            top,
            bottom,
          },
        }
      })
    }
  )
}
