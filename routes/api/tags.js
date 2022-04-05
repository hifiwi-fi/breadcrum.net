export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/tags',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/tags/rename',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/tags/merge',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )

  fastify.get(
    '/tags/delete',
    {},
    async (request, reply) => {
      throw new Error('not implemented')
    }
  )
}
