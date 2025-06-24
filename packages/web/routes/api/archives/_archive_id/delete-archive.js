import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
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

    const query = SQL`
      delete from archives
      where id = ${archiveId}
        and owner_id = ${ownerId}
    `

    const result = await fastify.pg.query(query)

    if (result.rowCount === 0) {
      return reply.status(404).send(/** @type {const} */({
        status: 'error',
        message: 'Archive not found or you do not have permission to delete it',
      }))
    }

    reply.status(202)
    fastify.otel.episodeDeleteCounter.add(1)

    return /** @type {const} */({
      status: 'ok',
    })
  })
}
