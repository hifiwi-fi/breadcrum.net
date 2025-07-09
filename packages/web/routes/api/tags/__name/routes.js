import { deleteTag } from './delete-tag.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function getBookmarksRoute (fastify, opts) {
  await Promise.all([
    deleteTag(fastify, opts),
  ])
}
