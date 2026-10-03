import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaEpisodeUpdate } from '../schemas/schema-episode-update.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function putEpisode (fastify, _opts) {
  fastify.put('/', {
    preHandler: fastify.auth([
      fastify.verifyJWT,
      fastify.notDisabled,
    ], {
      relation: 'and',
    }),
    schema: {
      tags: ['episodes'],
      querystring: {},
      params: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', format: 'uuid' },
        },
        required: ['episode_id'],
      },
      body: /** @type {SchemaEpisodeUpdate} */ (fastify.getSchema('schema:breadcrum:episode:update')),
    },
  },
  async function putEpisodeHandler (request, _reply) {
    return fastify.pg.transact(async client => {
      const ownerId = request.user.id
      const { episode_id: episodeId } = request.params
      const episode = request.body

      const updates = []

      // if (episode.url != null) updates.push(SQL`url = ${episode.url}`)
      if (episode.title != null) updates.push(SQL`title = ${episode.title}`)
      if (episode.explicit != null) updates.push(SQL`explicit = ${episode.explicit}`)
      // TODO: description editing
      // TODO: change medium or type?
      // TODO: re-run create episode steps

      if (updates.length > 0) {
        const query = SQL`
          update episodes
          set ${SQL.glue(updates, ' , ')}
          where id = ${episodeId}
          and owner_id =${ownerId};
          `

        await client.query(query)
      }

      fastify.otel.episodeEditCounter.add(1)

      return {
        status: 'ok',
      }
    })
  })
}
