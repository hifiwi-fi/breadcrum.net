/* eslint-disable camelcase */
import SQL from '@nearform/sql'

export async function deleteArchive (fastify, opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      params: {
        type: 'object',
        properties: {
          archive_id: { type: 'string', format: 'uuid' }
        },
        required: ['archive_id']
      }
    }
  },
  async function deleteArchiveHandler (request, reply) {
    const ownerID = request.user.id
    const archiveID = request.params.archive_id

    const query = SQL`
      delete from archives
      where id = ${archiveID}
        and owner_id = ${ownerID}
    `

    // TODO: check results
    await fastify.pg.query(query)

    reply.status = 202
    fastify.metrics.episodeDeleteCounter.inc()

    return {
      status: 'ok'
    }
  })
}
