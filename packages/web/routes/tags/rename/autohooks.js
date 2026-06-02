/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function tagsRenameHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
