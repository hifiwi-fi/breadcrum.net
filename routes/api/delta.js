export default async function deltaRoutes (fastify, opts) {
  fastify.get(
    '/last_update',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/delta/bookmarks',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )
}
