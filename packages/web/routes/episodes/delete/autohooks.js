/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function episodeDeleteHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
