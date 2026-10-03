import { getSearchBookmarks } from './get-search-bookmarks.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function searchBookmarksRoutes (fastify, opts) {
  await Promise.all([
    getSearchBookmarks(fastify, opts),
  ])
}
