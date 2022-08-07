export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/bookmarks',
    {},
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/tags',
    {},
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )
}
