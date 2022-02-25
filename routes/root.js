
export default async function rootRoutes (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return { root: true }
  })
}
