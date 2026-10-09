import { listPasskeys } from './list-passkeys.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function passkeyRoutes (fastify, opts) {
  await listPasskeys(fastify, opts)
}
