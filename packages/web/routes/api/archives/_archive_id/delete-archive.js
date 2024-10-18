import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function deleteArchive (fastify, _opts) {
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

    // TODO: check results
    await fastify.pg.query(query)

    reply.status(202)
    fastify.metrics.episodeDeleteCounter.inc()

    return {
      status: 'ok',
    }
  })
}
