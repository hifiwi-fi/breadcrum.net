/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function adminRedisCacheHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
