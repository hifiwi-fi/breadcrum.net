/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function adminFlagsHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
