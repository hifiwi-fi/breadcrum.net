/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

import { getBookmarks } from '../bookmarks/get-bookmarks-query.js'
import { schemaDeltaBookmarks } from './schemas/schema-delta-bookmarks.js'
import { schemaDeltaFeeds } from './schemas/schema-delta-feeds.js'
import { schemaDeltaLastUpdate } from './schemas/schema-delta-last-update.js'
import { getDeltaLastUpdate } from './get-delta-last-update.js'
import { getDeltaFeeds, getDeltaFeedsLastUpdate } from './get-delta-feeds.js'
import { getOrCreateDefaultFeed } from '@breadcrum/resources/feeds/default-feed-query.js'

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 * @returns {Promise<void>}
 */
export default async function deltaRoutes (fastify, _opts) {
  fastify.get(
    '/last_update',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        hide: true,
        response: {
          200: schemaDeltaLastUpdate,
        },
      },
    },
    async function getDeltaLastUpdateHandler (request, reply) {
      const [bookmarkLastUpdate, feedsLastUpdate] = await Promise.all([
        getDeltaLastUpdate({
          fastify,
          ownerId: request.user.id,
        }),
        getDeltaFeedsLastUpdate({
          fastify,
          ownerId: request.user.id,
        }),
      ])

      return reply.code(200).send({
        bookmarks: bookmarkLastUpdate,
        feeds: feedsLastUpdate,
      })
    }
  )

  fastify.get(
    '/bookmarks',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        hide: true,
        querystring: {
          type: 'object',
          properties: {
            sensitive: {
              type: 'boolean',
              default: false,
            },
            starred: {
              type: 'boolean',
              default: false,
            },
            toread: {
              type: 'boolean',
              default: false,
            },
          },
        },
        response: {
          200: schemaDeltaBookmarks,
        },
      },
    },
    async function getDeltaBookmarksHandler (request, reply) {
      const userId = request.user.id
      const {
        sensitive,
        starred,
        toread,
      } = request.query
      const [bookmarks, lastUpdate] = await Promise.all([
        getBookmarks({
          fastify,
          ownerId: userId,
          sensitive,
          starred,
          toread,
        }),
        getDeltaLastUpdate({
          fastify,
          ownerId: userId,
        }),
      ])

      return reply.code(200).send({
        data: bookmarks,
        last_update: lastUpdate,
      })
    }
  )

  fastify.get(
    '/feeds',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        hide: true,
        response: {
          200: schemaDeltaFeeds,
        },
      },
    },
    async function getDeltaFeedsHandler (request, reply) {
      const userId = request.user.id
      await getOrCreateDefaultFeed({
        userId,
        client: fastify.pg,
      })
      const [feeds, lastUpdate] = await Promise.all([
        getDeltaFeeds({
          fastify,
          ownerId: userId,
        }),
        getDeltaFeedsLastUpdate({
          fastify,
          ownerId: userId,
        }),
      ])

      return reply.code(200).send({
        data: feeds,
        last_update: lastUpdate,
      })
    }
  )
}
