import { getEpisode } from './get-episode.js'
import { putEpisode } from './put-episode.js'
import { deleteEpisode } from './delete-episode.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function episodeRoutes (fastify, opts) {
  await Promise.all([
    getEpisode(fastify, opts),
    putEpisode(fastify, opts),
    deleteEpisode(fastify, opts),
  ])
}
