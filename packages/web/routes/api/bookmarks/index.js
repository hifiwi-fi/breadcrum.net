import { getBookmarks } from './get-bookmarks.js'
import { putBookmarks } from './put-bookmarks.js'

/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

/**
 * @type {FastifyPluginAsync}
 * @returns {Promise<void>}
 */
export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    getBookmarks(fastify, opts),
    putBookmarks(fastify, opts),
  ])
}
