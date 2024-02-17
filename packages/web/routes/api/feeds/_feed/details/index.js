/* eslint-disable camelcase */
import { fullFeedProps } from '../../feed-props.js'
import { feedDetailsHandler } from './feed-details-handler.js'

export default async function getFeedDetails (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
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
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  ...fullFeedProps
                }
              }
            }
          }
        }
      }
    },

    async function getFeedHandler (request, reply) {
      const userId = request.user.id
      const { feed: feedId } = request.params

      return await feedDetailsHandler({
        fastify,
        request,
        reply,
        userId,
        feedId
      })
    })
}
