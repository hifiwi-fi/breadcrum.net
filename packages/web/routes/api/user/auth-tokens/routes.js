import { listAuthTokens } from './list-auth-tokens.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function authTokenRoutes (fastify, opts) {
  await listAuthTokens(fastify, opts)
}
