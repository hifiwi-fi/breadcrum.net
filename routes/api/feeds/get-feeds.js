import SQL from '@nearform/sql'
import { getOrCreateDefaultFeed } from './default-feed/get-or-create-default-feed-query.js'
import { fullFeedProps } from './feed-props.js'

export async function getFeeds (fastify, opts) {
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
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ...fullFeedProps,
                    default_feed: { type: 'boolean' },
                    episode_count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    async function getFeedsHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        // Ensure default feed exists
        await getOrCreateDefaultFeed({ userId, client })
        await client.query('commit')

        const query = SQL`
        select
          pf.id,
          pf.created_at,
          pf.updated_at,
          pf.title,
          pf.description,
          pf.image_url,
          pf.explicit,
          (pf.id = users.default_podcast_feed_id) as default_feed,
          count(ep.id) as episode_count
        from podcast_feeds pf
        left outer join users
        on users.default_podcast_feed_id = pf.id
        left outer join episodes ep
        on (pf.id = ep.podcast_feed_id)
        where pf.owner_id = ${userId}
        and ep.owner_id = ${userId}
        group by (
          pf.id,
          pf.created_at,
          pf.updated_at,
          pf.title,
          pf.description,
          pf.image_url,
          pf.explicit,
          default_feed
        )
        order by pf.created_at asc;
      `

        const results = await client.query(query)

        return {
          data: results.rows
        }
      })
    })
}
