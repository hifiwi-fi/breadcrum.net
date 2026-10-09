import { getBookmarkRoute } from './get-bookmark.js'
import { putBookmark } from './put-bookmark.js'
import { deleteBookmark } from './delete-bookmark.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export default async function getBookmarksRoute (fastify, opts) {
  await Promise.all([
    getBookmarkRoute(fastify, opts),
    putBookmark(fastify, opts),
    deleteBookmark(fastify, opts),
  ])
}
