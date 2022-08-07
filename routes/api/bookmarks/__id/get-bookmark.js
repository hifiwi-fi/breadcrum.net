/* eslint-disable camelcase */
import { getBookmarksQuery } from '../get-bookmark-query.js'
import { fullBookmarkProps } from '../bookmark-props.js'

export async function getBookmark (fastify, opts) {
  fastify.get(
    '/', {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
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
              ...fullBookmarkProps
            }
          }
        }
      }
    },
    async function getBookmarkHandler (request, reply) {
      const ownerId = request.user.id
      const { id: bookmarkId } = request.params

      const query = getBookmarksQuery({
        ownerId,
        bookmarkId,
        perPage: 1
      })

      console.log(query)

      const results = await fastify.pg.query(query)
      const bookmark = results.rows[0]
      if (!bookmark) {
        reply.code(404)
        return {
          status: 'bookmark id not found'
        }
      }
      return {
        ...bookmark
      }
    })
}
