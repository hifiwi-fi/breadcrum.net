import { getArchivesRoute } from './get-archives.js'
import { putArchives } from './put-archives.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function archiveRoutes (fastify, opts) {
  await Promise.all([
    getArchivesRoute(fastify, opts),
    putArchives(fastify, opts),
  ])
}
