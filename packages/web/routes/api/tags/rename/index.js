// import SQL from '@nearform/sql'

export default async function tagsRenameRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          properties: {
            old: { type: 'string', minLength: 1, maxLength: 255 },
            new: { type: 'string', minLength: 1, maxLength: 255 },
          },
          required: ['name'],
        },
      },
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )
}
