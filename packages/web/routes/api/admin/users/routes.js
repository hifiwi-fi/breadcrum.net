import { getAdminUsersRoute } from './get-admin-users.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function adminUsersRoutes (fastify, opts) {
  await Promise.all([
    getAdminUsersRoute(fastify, opts),
  ])
}
