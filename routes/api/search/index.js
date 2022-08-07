export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/search/bookmarks',
    {},
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/search/tags',
    {},
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )
}
