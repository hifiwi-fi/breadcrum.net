/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { feedProps, feedReadProps } from '../schemas/feed-base.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function putFeed (fastify, _opts) {
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
        body: {
          type: 'object',
          properties: {
            ...feedProps.properties,
          },
          minProperties: 1,
          additionalProperties: false,
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
                    ...feedProps.properties,
                    ...feedReadProps.properties
                  },
                },
              },
            },
          },
        },
      },
    },
    async function putFeedHandler (request, _reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const { feed: feedId } = request.params
        const {
          title,
          description,
          image_url,
          explicit,
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

          fastify.otel.podcastFeedEditCounter.add(1)
        }

        return {
          status: 'ok',
        }
      })
    })
}
