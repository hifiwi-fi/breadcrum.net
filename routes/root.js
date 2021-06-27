
export default async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    console.log(fastify.config)
    return { root: true }
  })
}
