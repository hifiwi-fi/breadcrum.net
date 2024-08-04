import { getUserRoute } from './get-user.js'
import { putUserRoute } from './put-user.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function userRoutes (fastify, opts) {
  await Promise.all([
    getUserRoute(fastify, opts),
    putUserRoute(fastify, opts),
  ])
}
