import { getBookmark } from '../get-bookmarks-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import {
 *  SchemaBookmarkWithArchivesAndEpisodes,
 * } from '../schemas/schema-bookmark-with-archives-and-episodes.js'
 * @import { SchemaBookmarkRead } from '../schemas/schema-bookmark-read.js'
 * @import { SchemaEpisodeRead } from '../../episodes/schemas/schema-episode-read.js'
 * @import { SchemaArchiveRead } from '../../archives/schemas/schema-archive-read.js'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *    references: [
 *     SchemaBookmarkWithArchivesAndEpisodes,
 *     SchemaBookmarkRead,
 *     SchemaEpisodeRead,
 *     SchemaArchiveRead
 *   ],
 *   deserialize: [{
 *       pattern: {
 *         type: "string"
 *         format: "date-time"
 *       }
 *       output: Date
 *     }]
 * }>}
 */
export async function getBookmarkRoute (fastify, _opts) {
  fastify.get(
    '/', {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['bookmarks'],
        querystring: {
          type: 'object',
          properties: {
            sensitive: {
              type: 'boolean',
              default: false,
            },
          }
        },
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            $ref: 'schema:breadcrum:bookmark:read',
          },
        },
      },
    },
    async function getBookmarkHandler (request, reply) {
      const ownerId = request.user.id
      const { id: bookmarkId } = request.params
      const { sensitive } = request.query

      const bookmark = getBookmark({
        fastify,
        ownerId,
        bookmarkId,
        perPage: 1,
        sensitive,
      })

      if (!bookmark) {
        return reply.notFound('bookmark id not found')
      }

      return bookmark
    })
}
