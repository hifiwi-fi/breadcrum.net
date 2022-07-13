// import SQL from '@nearform/sql'

export default async function podcastFeedsRoutes (fastify, opts) {
  fastify.get(
    '/:feed',
    {
      preHandler: fastify.auth([fastify.basicAuth]),
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
        }
      }
    },
    async function (request, reply) {
      const { userId } = request.feedTokenUser
      const { feed: feedId } = request.params
      if (!userId) throw new Error('missing authenticated feed userId')
    }
  )
}
