export default async function (fastify, opts) {
  fastify.addHook('preHandler', fastify.auth([
    fastify.verifyJWT,
    fastify.verifyAdmin,
  ], {
    relation: 'and',
  }))
}
