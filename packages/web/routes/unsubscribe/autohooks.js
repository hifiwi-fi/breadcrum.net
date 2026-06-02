/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function unsubscribeHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
