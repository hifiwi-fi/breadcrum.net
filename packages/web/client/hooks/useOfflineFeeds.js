/// <reference lib="dom" />

/**
 * @import { TypeFeedRead } from '../../routes/api/feeds/schemas/schema-feed-read.js'
 * @import { OfflineRefetchTarget } from './useOfflineReadSync.js'
 */

import { useLiveQuery } from '@tanstack/react-db'
import { useMemo, useCallback } from 'preact/hooks'
import { useLSP } from './useLSP.js'
import { getFeedsCollection } from '../lib/offline/feeds-collection.js'
import { refetchOfflineTarget } from './useOfflineReadSync.js'

/**
 * @typedef {object} OfflineFeedsOptions
 * @property {boolean} [enabled]
 */

/**
 * @param {TypeFeedRead[] | null | undefined} feeds
 * @param {string | null | undefined} feedId
 * @returns {TypeFeedRead | null}
 */
export function selectOfflineFeed (feeds, feedId) {
  if (!Array.isArray(feeds)) return null

  if (feedId) {
    return feeds.find(feed => feed.id === feedId) ?? null
  }

  return feeds.find(feed => feed.default_feed) ?? null
}

/**
 * @param {string | null | undefined} feedId
 * @param {OfflineFeedsOptions} [options]
 */
export function useOfflineFeed (feedId, options = {}) {
  const { enabled = true } = options
  const state = useLSP()
  const feedsCollection = useMemo(() => getFeedsCollection({
    apiUrl: state.apiUrl,
    userId: enabled ? state.user?.id ?? null : null,
  }), [enabled, state.apiUrl, state.user?.id])

  const {
    data,
    isLoading,
    isError,
  } = useLiveQuery(
    (query) => query.from({ feed: feedsCollection }),
    [feedsCollection]
  )

  const feed = useMemo(() => {
    if (!enabled) return null
    return selectOfflineFeed(data, feedId)
  }, [data, enabled, feedId])

  const reloadFeed = useCallback(async () => {
    const refetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (feedsCollection))
    await refetchOfflineTarget(refetchTarget)
  }, [feedsCollection])

  return {
    feed,
    feedLoading: enabled && isLoading,
    feedError: enabled && isError ? new Error('Offline feeds sync failed') : null,
    reloadFeed,
  }
}
