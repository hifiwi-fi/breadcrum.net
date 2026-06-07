/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

/**
 * @type {FastifyPluginAsync}
 */
export default async function bookmarkAddHooks (fastify) {
  await fastify.register(import('@fastify/formbody'))
}
