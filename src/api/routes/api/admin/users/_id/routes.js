/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import { getAdminUserRoute } from './get-admin-user.js'
import { putAdminUser } from './put-admin-user.js'
import { deleteAdminUser } from './delete-admin-user.js'

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function adminUserRoutes (fastify, opts) {
  await Promise.all([
    getAdminUserRoute(fastify, opts),
    putAdminUser(fastify, opts),
    deleteAdminUser(fastify, opts),
  ])
}
