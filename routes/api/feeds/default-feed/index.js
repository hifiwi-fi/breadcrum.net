import SQL from '@nearform/sql'
import { getOrCreateDefaultFeed } from './get-or-create-default-feed-query.js'

export default async function defaultFeedRoutes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri'
                  },
                  json: {
                    type: 'string',
                    format: 'uri'
                  }
                }
              }
            }
          }
        }
      }
    },
    async function getDefaultFeedHandler (request, reply) {
      const userId = request.user.id

      const feedId = await getOrCreateDefaultFeed({ userId, client: fastify.pg })

      const feedQuery = SQL`
          select
            pf.id,
            pf.created_at,
            pf.updated_at,
            pf.title,
            pf.description,
            pf.image_url,
            pf.explicit,
            pf.token,
            u.username as owner_name
          from podcast_feeds pf
          join users u
          on pf.owner_id = u.id
          where pf.id = ${feedId}
          and pf.owner_id = ${userId}
          fetch first row only;
        `

      const feedResults = await fastify.pg.query(feedQuery)

      const pf = feedResults.rows.pop()
      if (!pf) {
        return reply.notFound(`podcast feed ${feedId} not found`)
      }

      const feedURL = `${fastify.config.TRANSPORT}://${userId}:${pf.token}@${fastify.config.HOST}/api/feeds/${pf.id}`

      return {
        data: {
          url: `${fastify.config.TRANSPORT}://${userId}:${pf.token}@${fastify.config.HOST}/api/feeds/${pf.id}`,
          json: `${feedURL}?format=json`
        }
      }
    }
  )
}
