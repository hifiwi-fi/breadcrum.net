/* eslint-disable camelcase */
import SQL from '@nearform/sql'
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
      const userId = request.user.id
      const { id: bookmarkId } = request.params

      const query = SQL`
      with bookmark as (
        select bm.*
        from bookmarks bm
      )
      SELECT id, url, title, note, created_at, updated_at, toread, sensitive, starred, t.tag_array as tags
        FROM bookmarks
        LEFT OUTER JOIN(
          SELECT bt.bookmark_id as id, jsonb_agg(t.name) as tag_array
          FROM bookmarks_tags bt
          JOIN tags t ON t.id = bt.tag_id
          GROUP BY bt.bookmark_id
        ) t using (id)
        WHERE owner_id = ${userId}
          AND id = ${bookmarkId}
        LIMIT 1;
      `

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
