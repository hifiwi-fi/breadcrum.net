// import SQL from '@nearform/sql'

export default async function podcastItemsRoutes (fastify, opts) {
  fastify.get(
    '/podcast-items',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
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
