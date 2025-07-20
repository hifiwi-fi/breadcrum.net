import { listAuthTokens } from './list-auth-tokens.js'
import { bulkDeleteAuthTokens } from './bulk-delete-auth-tokens.js'
import { createAuthToken } from './create-auth-token.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function authTokenRoutes (fastify, opts) {
  await Promise.all([
    listAuthTokens(fastify, opts),
    bulkDeleteAuthTokens(fastify, opts),
    createAuthToken(fastify, opts),
  ])
}
