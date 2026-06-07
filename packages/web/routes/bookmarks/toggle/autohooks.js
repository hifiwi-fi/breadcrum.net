/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

/**
 * @type {FastifyPluginAsync}
 */
export default async function bookmarkToggleHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
