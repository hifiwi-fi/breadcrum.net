/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { fullFeedProps, commonFeedProps } from './feed-props.js'

export async function putFeeds (fastify, opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: {
        body: {
          type: 'object',
          properties: {
            ...commonFeedProps,
          },
          required: ['title', 'explicit', 'description'],
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
                    ...fullFeedProps,
                  },
                },
              },
            },
          },
        },
      },
    },
    async function createFeedHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        const {
          title,
          description,
          image_url,
          explicit,
        } = request.body

        const createFeed = SQL`
        insert into  (
          owner_id,
          title,
          description,
          image_url,
          explicit
        ) values (
          ${userId},
          ${title},
          ${description},
          ${image_url || null},
          ${explicit},
          ${userId}
        )
        returning
          id,
          owner_id,
          created_at,
          updated_at,
          title,
          description,
          image_url,
          explicit`

        const results = await client.query(createFeed)
        const feed = results.rows[0]

        return {
          status: 'ok',
          site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/api/feeds/${feed.id}/`,
        }
      })
    })
}
