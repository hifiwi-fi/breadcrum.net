/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function archiveDeleteHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
