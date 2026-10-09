import { feedProps, feedReadProps } from '../../schemas/feed-base.js'
import { feedDetailsHandler } from './feed-details-handler.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 * @returns {Promise<void>}
 */
export default async function getFeedDetails (fastify, _opts) {
  fastify.get(
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
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
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

    async function getFeedHandler (request, reply) {
      const userId = request.user.id
      const { feed: feedId } = request.params

      return await feedDetailsHandler({
        fastify,
        request,
        reply,
        userId,
        feedId,
      })
    })
}
