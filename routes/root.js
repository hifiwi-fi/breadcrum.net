
export default async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    let views = request.session.get('views') || 0
    const token = await reply.generateCsrf()
    request.session.set('views', ++views)
    return { root: true, views: request.session.get('views'), token }
  })
}
