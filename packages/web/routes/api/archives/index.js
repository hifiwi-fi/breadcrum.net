import { getArchives } from './get-archives.js'
import { putArchives } from './put-archives.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function archiveRoutes (fastify, opts) {
  await Promise.all([
    getArchives(fastify, opts),
    putArchives(fastify, opts),
  ])
}
