/// <reference lib="dom" />

/**
 * @import { TypeArchiveReadClient } from '../../routes/api/archives/schemas/schema-archive-read.js'
 * @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { OfflineRefetchTarget } from './useOfflineReadSync.js'
 */

import { useLiveQuery } from '@tanstack/react-db'
import { useMemo, useCallback } from 'preact/hooks'
import { useLSP } from './useLSP.js'
import { getBookmarksCollection } from '../lib/offline/bookmarks-collection.js'
import { refetchOfflineTarget } from './useOfflineReadSync.js'

/**
 * @typedef {object} OfflineArchivesOptions
 * @property {boolean} [enabled]
 * @property {boolean} [listFilters]
 * @property {boolean} [readyOnly]
 * @property {string | null} [archiveId]
 */

/**
 * @typedef {object} DeriveOfflineArchivesOptions
 * @property {boolean} [readyOnly]
 * @property {string | null} [archiveId]
 */

/**
 * @param {TypeBookmarkReadClient} bookmark
 * @param {TypeBookmarkReadClient['archives'][number]} archive
 * @returns {TypeArchiveReadClient | null}
 */
function toOfflineArchive (bookmark, archive) {
  if (!archive.id) return null

  const displayTitle = archive.display_title ?? archive.title ?? bookmark.title

  return {
    ...archive,
    updated_at: archive.updated_at ?? archive.created_at,
    ...(displayTitle ? { display_title: displayTitle } : {}),
    bookmark: {
      id: bookmark.id,
      url: bookmark.url,
      created_at: bookmark.created_at,
      updated_at: bookmark.updated_at,
      starred: bookmark.starred,
      toread: bookmark.toread,
      sensitive: bookmark.sensitive,
      archive_urls: bookmark.archive_urls,
      ...(bookmark.title ? { title: bookmark.title } : {}),
      ...(bookmark.note ? { note: bookmark.note } : {}),
      ...(bookmark.summary ? { summary: bookmark.summary } : {}),
      ...(bookmark.original_url ? { original_url: bookmark.original_url } : {}),
      ...(typeof bookmark.done === 'boolean' ? { done: bookmark.done } : {}),
    },
  }
}

/**
 * @param {TypeBookmarkReadClient[] | undefined} bookmarks
 * @param {DeriveOfflineArchivesOptions} [options]
 * @returns {TypeArchiveReadClient[] | null}
 */
export function deriveOfflineArchives (bookmarks, options = {}) {
  if (!Array.isArray(bookmarks)) return null

  const { readyOnly = true, archiveId = null } = options
  /** @type {TypeArchiveReadClient[]} */
  const archives = []

  for (const bookmark of bookmarks) {
    for (const archive of bookmark.archives) {
      if (archiveId && archive.id !== archiveId) continue
      if (readyOnly && archive.ready !== true) continue

      const offlineArchive = toOfflineArchive(bookmark, archive)
      if (offlineArchive) archives.push(offlineArchive)
    }
  }

  return archives.sort((a, b) => {
    const createdAtCompare = b.created_at.localeCompare(a.created_at)
    if (createdAtCompare !== 0) return createdAtCompare

    const urlCompare = b.url.localeCompare(a.url)
    if (urlCompare !== 0) return urlCompare

    return (b.title ?? '').localeCompare(a.title ?? '')
  })
}

/**
 * @param {OfflineArchivesOptions} [options]
 */
export function useOfflineArchives (options = {}) {
  const {
    enabled = true,
    listFilters = true,
    readyOnly = true,
    archiveId = null,
  } = options
  const state = useLSP()
  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: enabled ? state.user?.id ?? null : null,
    sensitive: state.sensitive,
    toread: listFilters ? state.toread : false,
    starred: listFilters ? state.starred : false,
  }), [enabled, listFilters, state.apiUrl, state.sensitive, state.starred, state.toread, state.user?.id])

  const {
    data,
    isLoading,
    isError,
  } = useLiveQuery(
    (query) => query.from({ bookmark: bookmarksCollection }),
    [bookmarksCollection]
  )

  const archives = useMemo(() => {
    if (!enabled) return null
    return deriveOfflineArchives(data, { readyOnly, archiveId })
  }, [archiveId, data, enabled, readyOnly])

  const reloadArchives = useCallback(async () => {
    const refetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (bookmarksCollection))
    await refetchOfflineTarget(refetchTarget)
  }, [bookmarksCollection])

  return {
    archivesLoading: enabled && isLoading,
    archivesError: enabled && isError ? new Error('Offline archives sync failed') : null,
    archives,
    reloadArchives,
    before: null,
    after: null,
    beforeParams: undefined,
    afterParams: undefined,
  }
}

/**
 * @param {string | null | undefined} archiveId
 * @param {OfflineArchivesOptions} [options]
 */
export function useOfflineArchive (archiveId, options = {}) {
  const offlineArchives = useOfflineArchives({
    ...options,
    archiveId: archiveId ?? null,
    listFilters: false,
    readyOnly: false,
  })
  const archive = offlineArchives.archives?.[0] ?? null

  return {
    archive,
    archiveLoading: offlineArchives.archivesLoading,
    archiveError: offlineArchives.archivesError,
    reloadArchive: offlineArchives.reloadArchives,
  }
}
