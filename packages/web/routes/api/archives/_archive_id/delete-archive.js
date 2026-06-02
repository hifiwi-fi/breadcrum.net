import { deleteArchiveById } from '../archive-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function deleteArchiveRoute (fastify, _opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      tags: ['archives'],
      params: {
        type: 'object',
        properties: {
          archive_id: { type: 'string', format: 'uuid' },
        },
        required: ['archive_id'],
      },
      response: {
        202: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: ['ok'] },
          },
          required: ['status'],
        },
        404: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: ['error'] },
            message: { type: 'string' },
          },
          required: ['status', 'message'],
        },
      },
    },
  },
  async function deleteArchiveHandler (request, reply) {
    const ownerId = request.user.id
    const archiveId = request.params.archive_id

    const result = await deleteArchiveById(fastify, { userId: ownerId, archiveId })

    if (!result.ok) {
      return reply.status(404).send(/** @type {const} */({
        status: 'error',
        message: result.message,
      }))
    }

    reply.status(202)

    return /** @type {const} */({
      status: 'ok',
    })
  })
}
