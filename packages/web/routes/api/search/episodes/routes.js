import { getSearchEpisodes } from './get-search-episodes.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function searchEpisodesRoutes (fastify, opts) {
  await Promise.all([
    getSearchEpisodes(fastify, opts),
  ])
}
