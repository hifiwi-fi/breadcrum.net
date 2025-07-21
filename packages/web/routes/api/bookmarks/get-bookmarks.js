/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkRead } from './schemas/schema-bookmark-read.js'
 * @import { GetBookmarksQueryParams } from './get-bookmarks-query.js'
 */

import { getBookmarks } from './get-bookmarks-query.js'
import { addMillisecond } from './addMillisecond.js'

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *    SerializerSchemaOptions: {
 *      references: [ SchemaBookmarkRead ],
 *      deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *    }
 *  }>}
*/
export async function getBookmarksHandler (fastify) {
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
                  $ref: 'schema:breadcrum:bookmark:read',
                }
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

      /** @type {GetBookmarksQueryParams} */
      const bookmarkParams = {
        ownerId: userId,
        sensitive,
        starred,
        toread,
        perPage: perPage + 1,
      }

      if (tag) bookmarkParams.tag = tag
      if (before) bookmarkParams.before = before
      if (after) bookmarkParams.after = after
      if (url) bookmarkParams.url = url

      const rows = await getBookmarks({ fastify, ...bookmarkParams })

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
