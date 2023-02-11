export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/bookmarks',
    {
      schema: {
        hide: true // TODO: remove when implemented
      }
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )

  fastify.get(
    '/tags',
    {
      schema: {
        hide: true // TODO: remove when implemented
      }
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )
}
