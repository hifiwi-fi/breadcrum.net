/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeBookmarkRead } from '../../bookmarks/schemas/schema-bookmark-read.js'
 */

import { getSearchBookmarksQuery } from './get-search-bookmarks-query.js'

/**
 * @typedef {TypeBookmarkRead & { rank: number }} SearchBookmarkResult
 */

/**
 * @typedef {object} SearchPageCursor
 * @property {string} rank
 * @property {string} id
 * @property {string} query
 * @property {boolean} reverse
 */

/**
 * @typedef {object} SearchPagination
 * @property {boolean} top
 * @property {boolean} bottom
 * @property {SearchPageCursor} [next]
 * @property {SearchPageCursor} [prev]
 */

/**
 * @typedef {object} BookmarkSearchParams
 * @property {string} userId
 * @property {string} query
 * @property {number} perPage
 * @property {boolean} sensitive
 * @property {boolean} starred
 * @property {boolean} toread
 * @property {string | undefined} [rank]
 * @property {string | undefined} [id]
 * @property {boolean | undefined} [reverse]
 */

/**
 * @typedef {object} BookmarkSearchResult
 * @property {SearchBookmarkResult[]} data
 * @property {SearchPagination} pagination
 */

/**
 * @param {FastifyInstance} fastify
 * @param {BookmarkSearchParams} params
 * @returns {Promise<BookmarkSearchResult>}
 */
export async function searchBookmarks (fastify, params) {
  const bookmarksQuery = getSearchBookmarksQuery({
    query: params.query,
    ownerId: params.userId,
    sensitive: params.sensitive,
    starred: params.starred,
    toread: params.toread,
    perPage: params.perPage + 1,
    lastRank: params.rank,
    lastId: params.id,
    reverse: params.reverse,
  })

  const results = await fastify.pg.query(bookmarksQuery)
  const reverse = params.reverse === true
  const top = !params.rank || (!params.rank && !params.id) || (reverse && results.rows.length <= params.perPage)
  const bottom = !reverse && results.rows.length <= params.perPage

  if (!reverse && !bottom) {
    results.rows.pop()
  }

  if (reverse && !top) {
    results.rows.shift()
  }

  /** @type {SearchPagination} */
  const pagination = {
    top,
    bottom,
  }

  if (!top) {
    const firstResult = results.rows.at(0)
    if (firstResult) {
      pagination.prev = {
        rank: String(firstResult.rank),
        id: firstResult.id,
        reverse: true,
        query: params.query,
      }
    }
  }

  if (!bottom) {
    const lastResult = results.rows.at(-1)
    if (lastResult) {
      pagination.next = {
        rank: String(lastResult.rank),
        id: lastResult.id,
        reverse: false,
        query: params.query,
      }
    }
  }

  return {
    data: /** @type {SearchBookmarkResult[]} */ (results.rows),
    pagination,
  }
}
