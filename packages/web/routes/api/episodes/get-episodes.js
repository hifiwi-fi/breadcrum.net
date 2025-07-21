import { getOrCreateDefaultFeed } from '@breadcrum/resources/feeds/default-feed-query.js'
import { getEpisodes } from './episode-query-get.js'
import { getFeedWithDefaults } from '../feeds/feed-defaults.js'
import { addMillisecond } from '../bookmarks/addMillisecond.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaEpisodeRead } from './schemas/schema-episode-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *  SerializerSchemaOptions: {
 *   references: [ SchemaEpisodeRead ],
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *  }
*  }>}
*/
export async function getEpisodesRoute (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['episodes'],
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
            additionalProperties: false,
            properties: {
              data: {
                type: 'array',
                items: {
                  $ref: 'schema:breadcrum:episode:read',
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  before: { type: ['string'], nullable: true, format: 'date-time' },
                  after: { type: ['string'], nullable: true, format: 'date-time' },
                  top: { type: 'boolean' },
                  bottom: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async function getEpisodesHandler (request, _reply) {
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

        const episodes = await getEpisodes({
          fastify,
          pg: client,
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

        const top = Boolean(
          (!before && !after) ||
          (after && episodes.length <= perPage)
        )
        const bottom = Boolean(
          (before && episodes.length <= perPage) ||
          (!before && !after && episodes.length <= perPage)
        )

        if (episodes.length > perPage) {
          if (after) {
            episodes.shift()
          } else {
            episodes.pop()
          }
        }

        const nextPage = bottom ? null : episodes.at(-1)?.created_at ?? null
        const prevPage = top ? null : addMillisecond(episodes[0]?.created_at)

        return {
          data: request.query.include_feed
            ? episodes.map(episode => {
              episode.podcast_feed = getFeedWithDefaults({
                feed: episode.podcast_feed,
                transport: fastify.config.TRANSPORT,
                host: fastify.config.HOST,
              })
              return episode
            })
            : episodes,
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
