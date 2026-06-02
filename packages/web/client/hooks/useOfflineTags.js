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
 * @typedef {object} TagSummary
 * @property {string} name
 * @property {number} count
 */

/**
 * @typedef {object} OfflineTagsOptions
 * @property {boolean} [enabled]
 */

/**
 * @param {TypeBookmarkReadClient[] | undefined} bookmarks
 * @returns {TagSummary[] | null}
 */
export function deriveOfflineTags (bookmarks) {
  if (!Array.isArray(bookmarks)) return null

  /** @type {Map<string, number>} */
  const counts = new Map()

  for (const bookmark of bookmarks) {
    for (const tag of bookmark.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count
      return a.name.localeCompare(b.name)
    })
}

/**
 * @param {OfflineTagsOptions} [options]
 */
export function useOfflineTags (options = {}) {
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

  const tags = useMemo(() => {
    if (!enabled) return null
    return deriveOfflineTags(data)
  }, [data, enabled])

  const reloadTags = useCallback(async () => {
    const refetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (bookmarksCollection))
    await refetchOfflineTarget(refetchTarget)
  }, [bookmarksCollection])

  return {
    tagsLoading: enabled && isLoading,
    tagsError: enabled && isError ? new Error('Offline tags sync failed') : null,
    tags,
    reloadTags,
  }
}
