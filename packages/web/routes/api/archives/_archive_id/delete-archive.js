import SQL from '@nearform/sql'

export async function deleteArchive (fastify, opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
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

    reply.status = 202
    fastify.metrics.episodeDeleteCounter.inc()

    return {
      status: 'ok',
    }
  })
}
