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
 * @typedef {object} OfflineBookmarksOptions
 * @property {boolean} [enabled]
 */

/**
 * @typedef {object} OfflineBookmarksResult
 * @property {boolean} bookmarksLoading
 * @property {Error | null} bookmarksError
 * @property {TypeBookmarkReadClient[] | null} bookmarks
 * @property {() => Promise<void>} reloadBookmarks
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {URLSearchParams | undefined} beforeParams
 * @property {URLSearchParams | undefined} afterParams
 */

/**
 * @param {OfflineBookmarksOptions} [options]
 * @returns {OfflineBookmarksResult}
 */
export function useOfflineBookmarks (options = {}) {
  const { enabled = true } = options
  const state = useLSP()
  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: enabled ? state.user?.id ?? null : null,
    sensitive: state.sensitive,
    toread: state.toread,
    starred: state.starred,
  }), [enabled, state.apiUrl, state.sensitive, state.starred, state.toread, state.user?.id])

  const {
    data,
    isLoading,
    isError,
  } = useLiveQuery(
    (query) => query.from({ bookmark: bookmarksCollection }),
    [bookmarksCollection]
  )

  const bookmarks = useMemo(() => {
    if (!enabled || !Array.isArray(data)) return null

    return [...data].sort((a, b) => {
      const createdAtCompare = b.created_at.localeCompare(a.created_at)
      if (createdAtCompare !== 0) return createdAtCompare

      const titleCompare = (b.title ?? '').localeCompare(a.title ?? '')
      if (titleCompare !== 0) return titleCompare

      return b.url.localeCompare(a.url)
    })
  }, [data, enabled])

  const reloadBookmarks = useCallback(async () => {
    const refetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (bookmarksCollection))
    await refetchOfflineTarget(refetchTarget)
  }, [bookmarksCollection])

  return {
    bookmarksLoading: enabled && isLoading,
    bookmarksError: enabled && isError ? new Error('Offline bookmarks sync failed') : null,
    bookmarks,
    reloadBookmarks,
    before: null,
    after: null,
    beforeParams: undefined,
    afterParams: undefined,
  }
}
