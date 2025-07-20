import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function deleteBookmark (fastify, _opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      tags: ['bookmarks'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        202: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok']
            }
          }
        }
      }
    },
  },
  async function deleteBookmarkHandler (request, reply) {
    const userId = request.user.id
    const bookmarkId = request.params.id

    const query = SQL`
      DELETE from bookmarks
      WHERE id = ${bookmarkId}
        AND owner_id =${userId};
      `

    // TODO: check results
    await fastify.pg.query(query)

    reply.status(202)
    fastify.otel.bookmarkDeleteCounter.add(1)
    return /** @type {const} */ ({
      status: 'ok',
    })
  })
}
