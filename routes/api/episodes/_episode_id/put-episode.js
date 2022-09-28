/* eslint-disable camelcase */
import SQL from '@nearform/sql'

import { commonEpisodeProps } from '../episode-props.js'

export async function putEpisode (fastify, opts) {
  fastify.put('/', {
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
        required: ['episode_id']
      },
      body: {
        type: 'object',
        properties: {
          ...commonEpisodeProps
        },
        minProperties: 1,
        additionalProperties: false
      }
    }
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

      console.log({ updates })

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
        status: 'ok'
      }
    })
  })
}
