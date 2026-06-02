/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function accountPasskeyHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
