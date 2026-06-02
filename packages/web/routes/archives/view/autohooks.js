/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function archiveViewHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
