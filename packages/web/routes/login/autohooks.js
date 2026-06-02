/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function loginHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
