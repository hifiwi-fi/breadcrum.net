import { deleteBookmarkById } from '../bookmark-delete-action.js'

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
    const result = await deleteBookmarkById(fastify, {
      userId: request.user.id,
      bookmarkId: request.params.id,
    })

    if (!result.ok) {
      return reply.notFound(result.message)
    }

    reply.status(202)
    return /** @type {const} */ ({
      status: 'ok',
    })
  })
}
