/// <reference lib="dom" />

/**
 * @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { OfflineRefetchTarget } from './useOfflineReadSync.js'
 */

import { useLiveQuery } from '@tanstack/react-db'
import { useMemo, useCallback } from 'preact/hooks'
import { useLSP } from './useLSP.js'
import { getBookmarksCollection } from '../lib/offline/bookmarks-collection.js'
import { refetchOfflineTarget } from './useOfflineReadSync.js'

/**
 * @typedef {object} OfflineBookmarkOptions
 * @property {boolean} [enabled]
 */

/**
 * @typedef {object} OfflineBookmarkResult
 * @property {boolean} bookmarkLoading
 * @property {Error | null} bookmarkError
 * @property {TypeBookmarkReadClient | null} bookmark
 * @property {() => Promise<void>} reloadBookmark
 */

/**
 * @param {TypeBookmarkReadClient[] | undefined} bookmarks
 * @param {string | null | undefined} bookmarkId
 * @returns {TypeBookmarkReadClient | null}
 */
export function selectOfflineBookmarkById (bookmarks, bookmarkId) {
  if (!bookmarkId || !Array.isArray(bookmarks)) return null
  return bookmarks.find(bookmark => bookmark.id === bookmarkId) ?? null
}

/**
 * @param {string | null | undefined} bookmarkId
 * @param {OfflineBookmarkOptions} [options]
 * @returns {OfflineBookmarkResult}
 */
export function useOfflineBookmark (bookmarkId, options = {}) {
  const { enabled = true } = options
  const state = useLSP()
  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: enabled ? state.user?.id ?? null : null,
    sensitive: state.sensitive,
    toread: false,
    starred: false,
  }), [enabled, state.apiUrl, state.sensitive, state.user?.id])

  const {
    data,
    isLoading,
    isError,
  } = useLiveQuery(
    (query) => query.from({ bookmark: bookmarksCollection }),
    [bookmarksCollection]
  )

  const bookmark = useMemo(() => {
    if (!enabled) return null
    return selectOfflineBookmarkById(data, bookmarkId)
  }, [bookmarkId, data, enabled])

  const reloadBookmark = useCallback(async () => {
    const refetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (bookmarksCollection))
    await refetchOfflineTarget(refetchTarget)
  }, [bookmarksCollection])

  return {
    bookmarkLoading: enabled && isLoading,
    bookmarkError: enabled && isError ? new Error('Offline bookmark sync failed') : null,
    bookmark,
    reloadBookmark,
  }
}
