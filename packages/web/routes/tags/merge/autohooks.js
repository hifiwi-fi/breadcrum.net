/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export default async function tagsMergeHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
