import { getEpisodesRoute } from './get-episodes.js'
import { putEpisodes } from './put-episodes.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function episodesRoutes (fastify, opts) {
  await Promise.all([
    getEpisodesRoute(fastify, opts),
    putEpisodes(fastify, opts),
  ])
}
