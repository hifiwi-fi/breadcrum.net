/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function feedsUpdateHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
