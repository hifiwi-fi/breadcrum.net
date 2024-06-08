export default async function rootRoute (fastify, opts) {
  fastify.get(
    '/',
    {},
    async function (request, reply) {
      return {
        hello: 'world',
        name: 'bc-worker',
        version: fastify.pkg.version,
      }
    }
  )
}
