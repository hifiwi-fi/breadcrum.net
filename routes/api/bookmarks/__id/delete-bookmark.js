/* eslint-disable camelcase */
import SQL from '@nearform/sql'

export async function deleteBookmark (fastify, opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  },
  async function deleteBookmarkHandler (request, reply) {
    const userId = request.user.id
    const bookmarkId = request.params.id

    const query = SQL`
      DELETE from bookmarks
      WHERE id = ${bookmarkId}
        AND owner_id =${userId};
      `

    await fastify.pg.query(query)

    reply.status = 202
    return {
      status: 'ok'
    }
  })
}
