/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function registerHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
