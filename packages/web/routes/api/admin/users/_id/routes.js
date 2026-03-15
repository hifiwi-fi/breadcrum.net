/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import { getAdminUserRoute } from './get-admin-user.js'
import { putAdminUser } from './put-admin-user.js'
import { deleteAdminUser } from './delete-admin-user.js'
import { putAdminCustomSubscription } from './put-admin-subscription.js'
import { deleteAdminCustomSubscription } from './delete-admin-subscription.js'
import { postAdminBillingSync } from './post-admin-sync.js'

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function adminUserRoutes (fastify, opts) {
  await Promise.all([
    getAdminUserRoute(fastify, opts),
    putAdminUser(fastify, opts),
    deleteAdminUser(fastify, opts),
    putAdminCustomSubscription(fastify, opts),
    deleteAdminCustomSubscription(fastify, opts),
    postAdminBillingSync(fastify, opts),
  ])
}
