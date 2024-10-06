import { getEpisodes } from './get-episodes.js'
import { putEpisodes } from './put-episodes.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function episodesRoutes (fastify, opts) {
  await Promise.all([
    getEpisodes(fastify, opts),
    putEpisodes(fastify, opts),
  ])
}
