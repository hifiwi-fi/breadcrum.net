import { getAdminFlags } from './get-admin-flags.js'
import { putAdminFlags } from './put-admin-flags.js'

/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

/**
 * @type {FastifyPluginAsync}
 * @returns {Promise<void>}
 */
export default async function adminFlagsRoutes (fastify, opts) {
  await Promise.all([
    getAdminFlags(fastify, opts),
    putAdminFlags(fastify, opts),
  ])
}
