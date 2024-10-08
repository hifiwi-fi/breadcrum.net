import { getBookmarksQuery } from '../get-bookmarks-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getBookmark (fastify, opts) {
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
            $ref: 'schema:breadcrum:bookmark-with-archives-and-episode',
          },
        },
      },
    },
    async function getBookmarkHandler (request, reply) {
      const ownerId = request.user.id
      const { id: bookmarkId } = request.params
      const { sensitive } = request.query

      const query = getBookmarksQuery({
        ownerId,
        bookmarkId,
        perPage: 1,
        sensitive,
      })

      const results = await fastify.pg.query(query)
      const bookmark = results.rows[0]
      if (!bookmark) {
        return reply.notFound('bookmark id not found')
      }
      return bookmark
    })
}
