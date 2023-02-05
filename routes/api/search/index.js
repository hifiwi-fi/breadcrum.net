export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/bookmarks',
    {
      schema: {
        hide: true // TODO: remove when implemented
      }
    },
    async function (request, reply) {
      throw new Error('not implemented')
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
      throw new Error('not implemented')
    }
  )
}
