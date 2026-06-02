/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function accountUsernameHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
