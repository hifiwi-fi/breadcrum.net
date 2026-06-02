import { feedProps, feedReadProps } from './schemas/feed-base.js'
import { listFeeds } from './feed-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *  SerializerSchemaOptions: {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *  }
 * }>}
 * @returns {Promise<void>}
 */
export async function getFeeds (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['feeds'],
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
                    ...feedReadProps.properties,
                    default_feed: { type: 'boolean' },
                    episode_count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async function getFeedsHandler (request, _reply) {
      return {
        data: /** @type {any} */ (await listFeeds(fastify, { userId: request.user.id })),
      }
    })
}
