/* eslint-disable camelcase */

import { getEpisodesQuery } from '../episode-query.js'
import { fullEpisodePropsWithBookmarkAndFeed } from '../mixed-episode-props.js'

export async function getEpisode (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          sensitive: {
            type: 'boolean',
            default: false
          }
        },
        params: {
          type: 'object',
          properties: {
            episode_id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ...fullEpisodePropsWithBookmarkAndFeed
            }
          }
        }
      }
    },
    async function getEpisodeHandler (request, reply) {
      const ownerId = request.user.episode_id
      const { episode_id: episodeId } = request.params
      const { sensitive } = request.query

      const episodeQuery = getEpisodesQuery({
        ownerId,
        episodeId,
        sensitive,
        perPage: 1,
        includeFeed: true
      })

      const results = await fastify.pg.query(episodeQuery)
      const episode = results.rows[0]

      if (!episode) {
        return reply.notFound('episide_id not found')
      }

      return {
        ...episode
      }
    }
  )
}
