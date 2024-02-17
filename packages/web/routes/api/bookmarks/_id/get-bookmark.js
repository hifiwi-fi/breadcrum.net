/* eslint-disable camelcase */
import { getBookmarksQuery } from '../get-bookmarks-query.js'
import { fullBookmarkPropsWithEpisodes } from '../mixed-bookmark-props.js'

export async function getBookmark (fastify, opts) {
  fastify.get(
    '/', {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          sensitive: {
            type: 'boolean',
            default: false
          }
        },
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ...fullBookmarkPropsWithEpisodes
            }
          }
        }
      }
    },
    async function getBookmarkHandler (request, reply) {
      const ownerId = request.user.id
      const { id: bookmarkId } = request.params
      const { sensitive } = request.query

      const query = getBookmarksQuery({
        ownerId,
        bookmarkId,
        perPage: 1,
        sensitive
      })

      const results = await fastify.pg.query(query)
      const bookmark = results.rows[0]
      if (!bookmark) {
        return reply.notFound('bookmark id not found')
      }
      return bookmark
    })
}
