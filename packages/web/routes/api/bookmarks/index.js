import { getBookmarks } from './get-bookmarks.js'
import { putBookmarks } from './put-bookmarks.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    getBookmarks(fastify, opts),
    putBookmarks(fastify, opts),
  ])
}
