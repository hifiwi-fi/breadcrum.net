export default async function deltaRoutes (fastify, opts) {
  fastify.get(
    '/last_update',
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
}
