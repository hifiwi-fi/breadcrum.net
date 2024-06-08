import { getBookmark } from './get-bookmark.js'
import { putBookmark } from './put-bookmark.js'
import { deleteBookmark } from './delete-bookmark.js'

export default async function getBookmarksRoute (fastify, opts) {
  await Promise.all([
    getBookmark(fastify, opts),
    putBookmark(fastify, opts),
    deleteBookmark(fastify, opts),
  ])
}
