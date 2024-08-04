import { getSearchArchives } from './get-search-archives.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function searchArchivesRoutes (fastify, opts) {
  await Promise.all([
    getSearchArchives(fastify, opts),
  ])
}
