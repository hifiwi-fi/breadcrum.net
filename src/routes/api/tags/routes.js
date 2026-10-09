import { getTags } from './get-tags.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function tagsRoutes (fastify, opts) {
  await Promise.all([
    getTags(fastify, opts),
  ])
}
