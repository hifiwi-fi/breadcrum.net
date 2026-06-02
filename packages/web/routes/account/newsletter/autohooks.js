/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function accountNewsletterHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
