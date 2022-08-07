export default async function deltaRoutes (fastify, opts) {
  fastify.get(
    '/last_update',
    {},
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/delta/bookmarks',
    {},
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )
}
