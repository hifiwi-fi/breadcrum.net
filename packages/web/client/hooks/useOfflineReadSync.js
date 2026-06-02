/// <reference lib="dom" />

/**
 * @import { QueryObserverResult } from '@tanstack/query-core'
 */

import { useEffect, useMemo } from 'preact/hooks'
import { useLSP } from './useLSP.js'
import { useOnlineStatus } from './useOnlineStatus.js'
import { useUser } from './useUser.js'
import { getBookmarksCollection } from '../lib/offline/bookmarks-collection.js'
import { getFeedsCollection } from '../lib/offline/feeds-collection.js'

/**
 * @typedef {object} OfflineRefetchTarget
 * @property {{ refetch: (opts?: { throwOnError?: boolean }) => Promise<Array<QueryObserverResult<unknown, unknown> | void>> }} utils
 */

/**
 * @typedef {object} OfflineReadSyncOptions
 * @property {boolean} [enabled]
 */

/**
 * @param {OfflineRefetchTarget} target
 * @returns {Promise<Array<QueryObserverResult<unknown, unknown> | void>>}
 */
export function refetchOfflineTarget (target) {
  return target.utils.refetch({ throwOnError: false })
}

/**
 * Starts read-only offline collection sync when the user is authenticated and online.
 *
 * @param {OfflineReadSyncOptions} [options]
 */
export function useOfflineReadSync (options = {}) {
  const { enabled = true } = options
  const state = useLSP()
  const online = useOnlineStatus()
  const { user } = useUser({ required: false })

  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: user?.id ?? null,
    sensitive: state.sensitive,
    toread: state.toread,
    starred: state.starred,
  }), [state.apiUrl, state.sensitive, state.starred, state.toread, user?.id])
  const feedsCollection = useMemo(() => getFeedsCollection({
    apiUrl: state.apiUrl,
    userId: user?.id ?? null,
  }), [state.apiUrl, user?.id])

  useEffect(() => {
    if (!enabled || !online || !user) return

    let cancelled = false

    const bookmarksRefetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (bookmarksCollection))
    const feedsRefetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (feedsCollection))

    Promise.all([
      refetchOfflineTarget(bookmarksRefetchTarget),
      refetchOfflineTarget(feedsRefetchTarget),
    ]).catch(err => {
      if (!cancelled) {
        console.error('Offline read sync failed:', err)
      }
    })

    return () => {
      cancelled = true
    }
  }, [bookmarksCollection, enabled, feedsCollection, online, user])
}
