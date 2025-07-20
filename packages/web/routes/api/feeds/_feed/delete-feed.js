import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function deleteFeed (fastify, _opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['feeds'],
        params: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['feed'],
        },
      },
    },
    async function deleteFeedHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const { feed: feedId } = request.params

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
            (pf.id = u.default_podcast_feed_id) as default_feed,
          from podcast_feeds pf
          join users u
          on pf.owner_id = u.id
          where pf.id = ${feedId}
          and pf.owner_id = ${userId}
          fetch first row only;
        `

        const feedResults = await client.query(feedQuery)

        const pf = feedResults.rows.pop()
        if (!pf) {
          return reply.notFound(`podcast feed ${feedId} not found`)
        }

        if (pf.default_feed) {
          return fastify.httpErrors.badRequest('Can\'t delete the default feed')
        }

        const query = SQL`
        delete from podcast_feeds
        where id = ${feedId}
        and owner_id =${userId};
        `

        // TODO: check results
        await fastify.pg.query(query)

        reply.status(202)
        fastify.otel.podcastFeedDeleteCounter.add(1)
        return {
          status: 'ok',
        }
      })
    })
}
