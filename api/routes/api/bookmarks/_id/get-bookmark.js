import { getBookmark } from '../get-bookmarks-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkRead } from '../schemas/schema-bookmark-read.js'
 */

/**
 * Gets a single bookmark by ID
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 * SerializerSchemaOptions: {
 *    references: [
 *     SchemaBookmarkRead
 *   ],
 *   deserialize: [{
 *       pattern: {
 *         type: "string"
 *         format: "date-time"
 *       }
 *       output: Date
 *     }]
 *  }
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
    async function getBookmarkHandler (request, _reply) {
      const ownerId = request.user.id
      const { id: bookmarkId } = request.params
      const { sensitive } = request.query

      const bookmark = await getBookmark({
        fastify,
        ownerId,
        bookmarkId,
        perPage: 1,
        sensitive,
      })

      if (!bookmark) {
        return _reply.notFound('bookmark id not found')
      }

      return bookmark
    })
}
