import { fullEpisodePropsWithBookmarkAndFeed } from './mixed-episode-props.js'
import { getOrCreateDefaultFeed } from '../feeds/default-feed/get-or-create-default-feed-query.js'
import { getEpisodesQuery, afterToBeforeEpisodesQuery } from './get-episode-query.js'

export async function getEpisodes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            before: {
              type: 'string',
              format: 'date-time'
            },
            after: {
              type: 'string',
              format: 'date-time'
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 20
            },
            sensitive: {
              type: 'boolean',
              default: false
            },
            feed_id: {
              type: 'string',
              format: 'uri'
            }
          },
          dependencies: {
            before: { allOf: [{ not: { required: ['after', 'url'] } }] },
            after: { allOf: [{ not: { required: ['before', 'url'] } }] }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ...fullEpisodePropsWithBookmarkAndFeed
                  }
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  before: { type: 'string', format: 'date-time' },
                  after: { type: 'string', format: 'date-time' },
                  top: { type: 'boolean' },
                  bottom: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    },
    async function getEpisodesHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        const {
          after,
          per_page: perPage,
          sensitive
        } = request.query
        let {
          before
        } = request.query

        const feedId = request.query.feed_id ?? await getOrCreateDefaultFeed({ client, userId })

        let top = false
        let bottom = false

        if (after) {
        // We have to fetch the first 2 rows because > is inclusive on timestamps (μS)
        // and we need to get the item before the next 'before' set.
          const perPageAfterOffset = perPage + 2
          const afterCalcQuery = afterToBeforeEpisodesQuery({
            perPage,
            ownerId: userId,
            after,
            sensitive,
            feedId
          })

          const afterToBeforeResults = await fastify.pg.query(afterCalcQuery)

          const {
            episode_count: episodeCount,
            last_created_at: lastCreatedAt
          } = afterToBeforeResults.rows.pop()

          if (episodeCount !== perPageAfterOffset) {
            top = true
            before = (new Date()).toISOString()
          } else {
            before = lastCreatedAt
          }
        }

        if (!before && !after) {
          top = true
          before = (new Date()).toISOString()
        }

        const episodeQuery = getEpisodesQuery({
          ownerId: userId,
          before,
          sensitive,
          perPage,
          feedId
        })

        const episodeResults = await fastify.pg.query(episodeQuery)

        if (episodeResults.rows.length !== perPage) bottom = true

        const nextPage = bottom ? null : episodeResults.rows.at(-1).created_at
        const prevPage = top ? null : episodeResults.rows[0]?.created_at || before

        return {
          data: episodeResults.rows,
          pagination: {
            before: nextPage,
            after: prevPage,
            top,
            bottom
          }
        }
      })
    }
  )
}
