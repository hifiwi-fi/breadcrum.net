import { getEpisode } from '../episode-query-get.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getEpisodeRoute (fastify, _opts) {
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
            $ref: 'schema:breadcrum:episode:read',
          },
        },
      },
    },
    async function getEpisodeHandler (request, reply) {
      const ownerId = request.user.id
      const { episode_id: episodeId } = request.params
      const { sensitive } = request.query

      const episode = await getEpisode({
        fastify,
        ownerId,
        episodeId,
        sensitive,
        perPage: 1,
        includeFeed: true,
      })

      if (!episode) {
        return reply.notFound('episide_id not found')
      }

      console.log({
        episode
      })

      return episode
    }
  )
}
