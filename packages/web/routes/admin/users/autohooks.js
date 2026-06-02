/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function adminUsersHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
