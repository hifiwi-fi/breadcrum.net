import { getAuthToken } from './get-auth-token.js'
import { deleteAuthToken } from './delete-auth-token.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function authTokenByJtiRoutes (fastify, opts) {
  await Promise.all([
    getAuthToken(fastify, opts),
    deleteAuthToken(fastify, opts),
  ])
}
