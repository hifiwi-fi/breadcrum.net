/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function passwordResetHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
