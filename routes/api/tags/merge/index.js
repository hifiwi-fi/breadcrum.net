// import SQL from '@nearform/sql'

export default async function tagsMergeRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        hide: true, // TODO: remove when implemented
        body: {
          type: 'object',
          properties: {
            source: {
              type: ['array', 'null'],
              items: {
                type: 'string', minLength: 1, maxLength: 255
              }
            },
            target: { type: 'string', minLength: 1, maxLength: 255 }
          },
          required: ['name']
        }
      }
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )
}
