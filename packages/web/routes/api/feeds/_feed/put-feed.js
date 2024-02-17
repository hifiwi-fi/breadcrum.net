/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { commonFeedProps, fullFeedProps } from '../feed-props.js'

export async function putFeed (fastify, opts) {
  const podcastFeedEditCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_podcast_feed_edit_total',
    help: 'The number of times podcast feeds are edited'
  })

  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled
      ], {
        relation: 'and'
      }),
      schema: {
        parms: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid'
            }
          },
          required: ['feed']
        },
        body: {
          type: 'object',
          properties: {
            ...commonFeedProps
          },
          minProperties: 1,
          additionalProperties: false
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
                    ...fullFeedProps
                  }
                }
              }
            }
          }
        }
      }
    },
    async function putFeedHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const { feed: feedId } = request.params
        const {
          title,
          description,
          image_url,
          explicit
        } = request.body

        const updates = []

        if (title != null) updates.push(SQL`title = ${title}`)
        if (description != null) updates.push(SQL`description = ${description}`)
        if (image_url != null) updates.push(SQL`image_url = ${image_url}`)
        if (explicit != null) updates.push(SQL`explicit = ${explicit}`)

        if (updates.length > 0) {
          const query = SQL`
          update podcast_feeds
          set ${SQL.glue(updates, ' , ')}
          where id = ${feedId}
          and owner_id =${userId};
          `

          await client.query(query)

          podcastFeedEditCounter.inc()
        }

        return {
          status: 'ok'
        }
      })
    })
}
