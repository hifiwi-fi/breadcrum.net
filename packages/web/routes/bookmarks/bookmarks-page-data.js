/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeBookmarkRead } from '../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { GetBookmarksQueryParams } from '../api/bookmarks/get-bookmarks-query.js'
 */

import { addMillisecond } from '../api/bookmarks/addMillisecond.js'
import { getBookmarks } from '../api/bookmarks/get-bookmarks-query.js'

/**
 * @typedef {object} BookmarkFilters
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {number} perPage
 * @property {string} tag
 * @property {boolean} sensitive
 * @property {boolean} starred
 * @property {boolean} toread
 * @property {string} queryString
 */

/**
 * @typedef {object} BookmarkPagination
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 * @property {boolean} bottom
 */

/**
 * @typedef {object} BookmarksPageData
 * @property {TypeBookmarkRead[]} bookmarks
 * @property {BookmarkPagination} pagination
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {BookmarkFilters} params.filters
 * @returns {Promise<BookmarksPageData>}
 */
export async function getBookmarksPageData (fastify, { userId, filters }) {
  /** @type {GetBookmarksQueryParams} */
  const queryParams = {
    ownerId: userId,
    sensitive: filters.sensitive,
    starred: filters.starred,
    toread: filters.toread,
    perPage: filters.perPage + 1,
  }

  if (filters.tag) queryParams.tag = filters.tag
  if (filters.before) queryParams.before = filters.before.toISOString()
  if (filters.after) queryParams.after = filters.after.toISOString()

  const rows = await getBookmarks({
    fastify,
    ...queryParams,
  })

  const top = Boolean(
    (!filters.before && !filters.after) ||
    (filters.after && rows.length <= filters.perPage)
  )
  const bottom = Boolean(
    (filters.before && rows.length <= filters.perPage) ||
    (!filters.before && !filters.after && rows.length <= filters.perPage)
  )

  if (rows.length > filters.perPage) {
    if (filters.after) {
      rows.shift()
    } else {
      rows.pop()
    }
  }

  return {
    bookmarks: rows,
    pagination: {
      before: bottom ? null : rows.at(-1)?.created_at ?? null,
      after: top ? null : addMillisecond(rows[0]?.created_at),
      top,
      bottom,
    },
  }
}
