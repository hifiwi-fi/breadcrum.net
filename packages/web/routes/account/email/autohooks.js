/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function accountEmailHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
