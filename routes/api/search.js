export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/search/bookmarks',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/search/tags',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )
}
