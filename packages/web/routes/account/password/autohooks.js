/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function accountPasswordHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
