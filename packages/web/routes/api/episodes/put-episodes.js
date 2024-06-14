import { fullEpisodePropsWithBookmarkAndFeed } from './mixed-episode-props.js'
export async function putEpisodes (fastify, opts) {
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
        tags: ['episodes'],
        querystring: {
          type: 'object',
          properties: {
            before: {
              type: 'string',
              format: 'date-time',
            },
            after: {
              type: 'string',
              format: 'date-time',
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 20,
            },
            sensitive: {
              type: 'boolean',
              default: false,
            },
            feed_id: {
              type: 'string',
              format: 'uri',
            },
          },
          dependencies: {
            before: { allOf: [{ not: { required: ['after', 'url'] } }] },
            after: { allOf: [{ not: { required: ['before', 'url'] } }] },
          },
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
                    ...fullEpisodePropsWithBookmarkAndFeed,
                  },
                },
              },
            },
          },
        },
      },
    },
    async function putEpisodesHandler (request, reply) {
      return reply.notImplemented()
    }
  )
}
