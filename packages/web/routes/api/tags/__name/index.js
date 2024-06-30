import { deleteTag } from './delete-tag.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function getBookmarksRoute (fastify, opts) {
  await Promise.all([
    deleteTag(fastify, opts),
  ])
}
