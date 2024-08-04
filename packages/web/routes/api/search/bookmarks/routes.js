import { getSearchBookmarks } from './get-search-bookmarks.js'

export default async function searchBookmarksRoutes (fastify, opts) {
  await Promise.all([
    getSearchBookmarks(fastify, opts),
  ])
}
