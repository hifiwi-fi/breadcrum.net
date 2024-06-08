export default async function deltaRoutes (fastify, opts) {
  fastify.get(
    '/last_update',
    {
      schema: {
        hide: true, // TODO: remove when implemented
      },
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )

  fastify.get(
    '/bookmarks',
    {
      schema: {
        hide: true, // TODO: remove when implemented
      },
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )
}
