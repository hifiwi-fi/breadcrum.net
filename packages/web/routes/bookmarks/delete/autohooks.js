/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function bookmarkDeleteHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
