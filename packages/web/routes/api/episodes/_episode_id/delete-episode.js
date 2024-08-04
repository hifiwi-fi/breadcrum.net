import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function deleteEpisode (fastify, _opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      tags: ['episodes'],
      params: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', format: 'uuid' },
        },
        required: ['episode_id'],
      },
    },
  },
  async function deleteEpisodeHandler (request, reply) {
    const ownerId = request.user.id
    const episodeId = request.params.episode_id

    const query = SQL`
      delete from episodes
      where id = ${episodeId}
        and owner_id = ${ownerId}
    `

    // TODO: check results
    await fastify.pg.query(query)

    reply.status(202)
    fastify.prom.episodeDeleteCounter.inc()

    return {
      status: 'ok',
    }
  })
}
