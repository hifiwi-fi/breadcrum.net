import { getEpisodesQuery } from '../episode-query-get.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getEpisode (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['episodes'],
        querystring: {
          type: 'object',
          properties: {
            sensitive: {
              type: 'boolean',
              default: false,
            },
          }
        },
        params: {
          type: 'object',
          properties: {
            episode_id: { type: 'string', format: 'uuid' },
          },
          required: ['episode_id'],
        },
        response: {
          200: {
            $ref: 'schema:breadcrum:episode-with-bookmark-and-feed',
          },
        },
      },
    },
    async function getEpisodeHandler (request, reply) {
      const ownerId = request.user.id
      const { episode_id: episodeId } = request.params
      const { sensitive } = request.query

      const episodeQuery = getEpisodesQuery({
        ownerId,
        episodeId,
        sensitive,
        perPage: 1,
        includeFeed: true,
      })

      const results = await fastify.pg.query(episodeQuery)
      const episode = results.rows[0]

      if (!episode) {
        return reply.notFound('episide_id not found')
      }

      return {
        ...episode,
      }
    }
  )
}
