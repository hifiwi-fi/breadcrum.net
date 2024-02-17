export default async function (fastify, opts) {
  fastify.register(import('@fastify/formbody'))
}
