import SQL from '@nearform/sql'
import { bookmarkSyncHeaders, bookmarkSyncReceipt } from '../schemas/bookmark-sync.js'
import { bookmarkReceipt, withBookmarkReceipt } from '../sync-receipt.js'

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
      description: 'Delete a bookmark.',
      headers: bookmarkSyncHeaders,
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          required: ['sync'],
          properties: { sync: bookmarkSyncReceipt },
        },
        409: { $ref: 'HttpError' },
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
    const bookmarkId = request.params.id.toLowerCase()

    const query = SQL`
      delete from bookmarks
      where id = ${bookmarkId} and owner_id = ${userId}
      `

    const operationId = request.headers['idempotency-key']
    if (operationId) {
      reply.header('Cache-Control', 'private, no-store')
      const sync = await fastify.pg.transact(client => withBookmarkReceipt(
        client, fastify.httpErrors, userId, operationId, ['delete', bookmarkId], async id => {
          const result = await client.query(query)
          return bookmarkReceipt(id, bookmarkId, result.rowCount ? 'deleted' : 'bookmark_missing')
        }
      ))
      return reply.code(200).send({ sync })
    }

    // TODO: check results
    await fastify.pg.query(query)

    reply.status(202)
    fastify.otel.bookmarkDeleteCounter.add(1)
    return /** @type {const} */ ({
      status: 'ok',
    })
  })
}
