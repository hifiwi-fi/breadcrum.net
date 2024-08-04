import { getSearchEpisodes } from './get-search-episodes.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function searchEpisodesRoutes (fastify, opts) {
  await Promise.all([
    getSearchEpisodes(fastify, opts),
  ])
}
