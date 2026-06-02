/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function episodeViewHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
