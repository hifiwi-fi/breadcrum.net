import { getBookmarksHandler } from './get-bookmarks.js'
import { putBookmarks } from './put-bookmarks.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    getBookmarksHandler(fastify, opts),
    putBookmarks(fastify, opts),
  ])
}
