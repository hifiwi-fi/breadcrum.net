import { feedProps, feedReadProps } from '../schemas/feed-base.js'
import { updateFeedDetails } from '../feed-actions.js'

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
    async function putFeedHandler (request, reply) {
      const result = await updateFeedDetails(fastify, {
        userId: request.user.id,
        feedId: request.params.feed,
        input: request.body,
      })

      if (!result.ok) {
        if (result.statusCode === 404) return reply.notFound(result.message)
        return reply.unprocessableEntity(result.message)
      }

      return {
        status: 'ok',
      }
    })
}
