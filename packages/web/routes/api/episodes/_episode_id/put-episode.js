import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
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
      body: {
        type: 'object',
        $ref: 'schema:breadcrum:episode:base',
        minProperties: 1,
        additionalProperties: false,
      },
    },
  },
  async function putEpisodeHandler (request, reply) {
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

      fastify.metrics.episodeEditCounter.inc()

      return {
        status: 'ok',
      }
    })
  })
}
