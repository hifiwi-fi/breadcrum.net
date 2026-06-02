/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function bookmarkViewHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
