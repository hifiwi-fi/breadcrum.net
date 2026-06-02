/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function tagsDeleteHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
