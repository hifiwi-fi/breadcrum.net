import { getArchiveRoute } from './get-archive.js'
import { putArchiveRoute } from './put-archive.js'
import { deleteArchiveRoute } from './delete-archive.js'

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
    putArchiveRoute(fastify, opts),
    getArchiveRoute(fastify, opts),
    deleteArchiveRoute(fastify, opts),
  ])
}
