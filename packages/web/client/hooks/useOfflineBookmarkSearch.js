/// <reference lib="dom" />

/** @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { useMemo } from 'preact/hooks'
import { useOfflineBookmarks } from './useOfflineBookmarks.js'

/**
 * @typedef {object} OfflineBookmarkSearchOptions
 * @property {boolean} [enabled]
 */

/**
 * @typedef {object} SearchResult
 * @property {TypeBookmarkReadClient} bookmark
 * @property {number} score
 */

/**
 * @param {string | undefined} value
 * @returns {string}
 */
function normalizeSearchText (value) {
  return (value ?? '').toLocaleLowerCase()
}

/**
 * @param {string | undefined} value
 * @param {string[]} terms
 * @param {number} weight
 * @returns {number}
 */
function scoreField (value, terms, weight) {
  const normalized = normalizeSearchText(value)
  let score = 0

  for (const term of terms) {
    if (!normalized.includes(term)) continue
    score += normalized.startsWith(term) ? weight * 2 : weight
  }

  return score
}

/**
 * @param {TypeBookmarkReadClient} bookmark
 * @param {string[]} terms
 * @returns {number}
 */
function scoreBookmark (bookmark, terms) {
  return (
    scoreField(bookmark.title, terms, 8) +
    scoreField(bookmark.tags.join(' '), terms, 6) +
    scoreField(bookmark.url, terms, 4) +
    scoreField(bookmark.note, terms, 3) +
    scoreField(bookmark.summary, terms, 2)
  )
}

/**
 * @param {TypeBookmarkReadClient} bookmark
 * @returns {string}
 */
function getBookmarkSearchText (bookmark) {
  return normalizeSearchText([
    bookmark.title,
    bookmark.url,
    bookmark.note,
    bookmark.summary,
    ...bookmark.tags,
  ].filter(value => typeof value === 'string' && value.length > 0).join(' '))
}

/**
 * @param {TypeBookmarkReadClient[] | null | undefined} bookmarks
 * @param {string} query
 * @returns {TypeBookmarkReadClient[] | null}
 */
export function searchOfflineBookmarks (bookmarks, query) {
  if (!Array.isArray(bookmarks)) return null

  const terms = normalizeSearchText(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return []

  /** @type {SearchResult[]} */
  const results = []

  for (const bookmark of bookmarks) {
    const searchText = getBookmarkSearchText(bookmark)
    if (!terms.every(term => searchText.includes(term))) continue

    results.push({
      bookmark,
      score: scoreBookmark(bookmark, terms),
    })
  }

  return results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score

    const createdAtCompare = b.bookmark.created_at.localeCompare(a.bookmark.created_at)
    if (createdAtCompare !== 0) return createdAtCompare

    return a.bookmark.id.localeCompare(b.bookmark.id)
  }).map(result => result.bookmark)
}

/**
 * @param {string} query
 * @param {OfflineBookmarkSearchOptions} [options]
 */
export function useOfflineBookmarkSearch (query, options = {}) {
  const offlineBookmarks = useOfflineBookmarks(options)
  const bookmarks = useMemo(
    () => searchOfflineBookmarks(offlineBookmarks.bookmarks, query),
    [offlineBookmarks.bookmarks, query]
  )

  return {
    bookmarksLoading: offlineBookmarks.bookmarksLoading,
    bookmarksError: offlineBookmarks.bookmarksError,
    bookmarks,
    reloadBookmarks: offlineBookmarks.reloadBookmarks,
  }
}
