import { getArchive } from './get-archive.js'
import { putArchive } from './put-archive.js'
import { deleteArchive } from './delete-archive.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function episodeRoutes (fastify, opts) {
  await Promise.all([
    getArchive(fastify, opts),
    putArchive(fastify, opts),
    deleteArchive(fastify, opts),
  ])
}
