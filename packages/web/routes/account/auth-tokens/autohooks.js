/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function accountAuthTokenHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
