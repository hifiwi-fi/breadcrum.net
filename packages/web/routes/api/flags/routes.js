import { getFlags } from './get-flags.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    getFlags(fastify, opts),
  ])
}
