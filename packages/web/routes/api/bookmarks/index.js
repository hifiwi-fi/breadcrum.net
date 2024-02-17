import { getBookmarks } from './get-bookmarks.js'
import { putBookmarks } from './put-bookmarks.js'

export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    getBookmarks(fastify, opts),
    putBookmarks(fastify, opts)
  ])
}
