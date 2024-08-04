import { getBookmarksQuery } from './get-bookmarks-query.js'
import { addMillisecond } from './addMillisecond.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import {
 *  TypeBookmarkWithArchivesAndEpisodes,
 *  SchemaBookmarkWithArchivesAndEpisodes,
 * } from './schemas/schema-bookmark-with-archives-and-episodes.js'
 * @import { SchemaBookmarkRead } from './schemas/schema-bookmark-read.js'
 * @import { SchemaEpisodeRead } from '../episodes/schemas/schema-episode-read.js'
 * @import { SchemaArchiveRead } from '../archives/schemas/schema-archive-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   references: [
 *     SchemaBookmarkWithArchivesAndEpisodes,
 *     SchemaBookmarkRead,
 *     SchemaEpisodeRead,
 *     SchemaArchiveRead
 *   ],
 *    deserialize: [{
 *       pattern: {
 *         type: "string"
 *         format: "date-time"
 *       }
 *       output: Date
 *     }]
* }>}
*/
export async function getBookmarks (fastify) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['bookmarks'],

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
            url: {
              type: 'string',
              format: 'uri',
            },
            tag: {
              type: 'string', minLength: 1, maxLength: 255,
            },
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
          dependencies: {
            before: { allOf: [{ not: { required: ['after', 'url'] } }] },
            after: { allOf: [{ not: { required: ['before', 'url'] } }] },
          },
        },

        response: {
          200: {
            type: 'object',
            unevaluatedProperties: false,
            properties: {
              data: {
                type: 'array',
                items: {
                  $ref: 'schema:breadcrum:bookmark-with-archives-and-episode',
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  before: { type: ['string', 'null'], format: 'date-time' },
                  after: { type: ['string', 'null'], format: 'date-time' },
                  top: { type: 'boolean' },
                  bottom: { type: 'boolean' },
                },
              },
            },
          },
        },
      },

    },
    // Get Bookmarks
    async function getBookmarksHandler (request, reply) {
      const userId = request.user.id
      const {
        before,
        after,
        per_page: perPage,
        url,
        tag,
        sensitive,
        starred,
        toread,
      } = request.query

      const bookmarkQuery = getBookmarksQuery({
        tag,
        ownerId: userId,
        before,
        after,
        url,
        sensitive,
        starred,
        toread,
        perPage: perPage + 1,
      })

      const results = await fastify.pg.query(bookmarkQuery)

      /** @type {TypeBookmarkWithArchivesAndEpisodes[]} */
      const rows = results.rows

      const top = Boolean(
        (!before && !after) ||
        (after && rows.length <= perPage)
      )
      const bottom = Boolean(
        (before && rows.length <= perPage) ||
        (!before && !after && rows.length <= perPage)
      )

      if (rows.length > perPage) {
        if (after) {
          rows.shift()
        } else {
          rows.pop()
        }
      }

      const nextPage = bottom ? null : rows.at(-1)?.created_at ?? null
      const prevPage = top ? null : addMillisecond(rows[0]?.created_at)

      const response = {
        data: rows,
        pagination: {
          before: nextPage,
          after: prevPage,
          top,
          bottom,
        },
      }

      reply.status(200)

      return response
    }
  )
}
