/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function bookmarkAddHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
