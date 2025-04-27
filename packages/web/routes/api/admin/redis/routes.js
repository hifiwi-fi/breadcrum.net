import { flushCache } from './flushdb.js'

/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminFlagsRoutes (fastify, opts) {
  await Promise.all([
    flushCache(fastify, opts),
  ])
}
