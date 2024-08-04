import { getEpisodeRoute } from './get-episode.js'
import { putEpisode } from './put-episode.js'
import { deleteEpisode } from './delete-episode.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function episodeRoutes (fastify, opts) {
  await Promise.all([
    getEpisodeRoute(fastify, opts),
    putEpisode(fastify, opts),
    deleteEpisode(fastify, opts),
  ])
}
