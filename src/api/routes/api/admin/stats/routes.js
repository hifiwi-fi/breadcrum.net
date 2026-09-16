import { getAdminStats } from './get-admin-stats.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export default async function adminStatsRoutes (fastify, opts) {
  await Promise.all([
    getAdminStats(fastify, opts),
  ])
}
