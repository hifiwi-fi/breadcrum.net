// import SQL from '@nearform/sql'

export default async function podcastFeedsRoutes (fastify, opts) {
  fastify.get(
    '/podcast-feeds/:id',
    {
      preHandler: fastify.auth([fastify.basicAuth, fastify.verifyJWT]),
      schema: {
        querystring: {
          type: 'object',
          properties: {}
        },
        response: {
          200: {}
        }
      }
    },
    async function (request, reply) {}
  )
}
