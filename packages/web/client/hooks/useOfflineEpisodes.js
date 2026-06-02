/// <reference lib="dom" />

/**
 * @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js'
 * @import { OfflineRefetchTarget } from './useOfflineReadSync.js'
 */

import { useLiveQuery } from '@tanstack/react-db'
import { useMemo, useCallback } from 'preact/hooks'
import { useLSP } from './useLSP.js'
import { useSearchParamsAll } from './useSearchParams.js'
import { getBookmarksCollection } from '../lib/offline/bookmarks-collection.js'
import { refetchOfflineTarget } from './useOfflineReadSync.js'

/**
 * @typedef {object} OfflineEpisodesOptions
 * @property {boolean} [enabled]
 * @property {boolean} [listFilters]
 * @property {boolean} [readyOnly]
 * @property {string | null} [episodeId]
 * @property {string | null} [bookmarkId]
 * @property {string | null} [feedId]
 */

/**
 * @typedef {object} DeriveOfflineEpisodesOptions
 * @property {boolean} [readyOnly]
 * @property {string | null} [episodeId]
 * @property {string | null} [bookmarkId]
 * @property {string | null} [feedId]
 */

/**
 * @param {TypeBookmarkReadClient} bookmark
 * @param {TypeBookmarkReadClient['episodes'][number]} episode
 * @returns {TypeEpisodeReadClient | null}
 */
function toOfflineEpisode (bookmark, episode) {
  if (!episode.id) return null

  const displayTitle = episode.display_title ?? episode.title ?? bookmark.title

  return {
    ...episode,
    updated_at: episode.updated_at ?? episode.created_at ?? bookmark.updated_at,
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
 * @param {DeriveOfflineEpisodesOptions} [options]
 * @returns {TypeEpisodeReadClient[] | null}
 */
export function deriveOfflineEpisodes (bookmarks, options = {}) {
  if (!Array.isArray(bookmarks)) return null

  const { readyOnly = false, episodeId = null, bookmarkId = null, feedId = null } = options
  /** @type {TypeEpisodeReadClient[]} */
  const episodes = []

  for (const bookmark of bookmarks) {
    if (bookmarkId && bookmark.id !== bookmarkId) continue

    for (const episode of bookmark.episodes) {
      if (episodeId && episode.id !== episodeId) continue
      if (feedId !== null && episode.podcast_feed_id !== feedId) continue
      if (readyOnly && episode.ready !== true) continue

      const offlineEpisode = toOfflineEpisode(bookmark, episode)
      if (offlineEpisode) episodes.push(offlineEpisode)
    }
  }

  return episodes.sort((a, b) => {
    const createdAtCompare = (b.created_at ?? '').localeCompare(a.created_at ?? '')
    if (createdAtCompare !== 0) return createdAtCompare

    const urlCompare = (b.url ?? '').localeCompare(a.url ?? '')
    if (urlCompare !== 0) return urlCompare

    return (b.title ?? '').localeCompare(a.title ?? '')
  })
}

/**
 * @param {OfflineEpisodesOptions} [options]
 */
export function useOfflineEpisodes (options = {}) {
  const {
    enabled = true,
    listFilters = false,
    readyOnly = false,
    episodeId = null,
    feedId = null,
  } = options
  const state = useLSP()
  const { searchParamsAll } = useSearchParamsAll()
  const bookmarkId = options.bookmarkId === undefined
    ? searchParamsAll?.get('bid') ?? null
    : options.bookmarkId
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

  const episodes = useMemo(() => {
    if (!enabled) return null
    return deriveOfflineEpisodes(data, { readyOnly, episodeId, bookmarkId, feedId })
  }, [bookmarkId, data, enabled, episodeId, feedId, readyOnly])

  const reloadEpisodes = useCallback(async () => {
    const refetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (bookmarksCollection))
    await refetchOfflineTarget(refetchTarget)
  }, [bookmarksCollection])

  return {
    episodesLoading: enabled && isLoading,
    episodesError: enabled && isError ? new Error('Offline episodes sync failed') : null,
    episodes,
    reloadEpisodes,
    before: null,
    after: null,
    beforeParams: undefined,
    afterParams: undefined,
  }
}

/**
 * @param {string | null | undefined} episodeId
 * @param {OfflineEpisodesOptions} [options]
 */
export function useOfflineEpisode (episodeId, options = {}) {
  const offlineEpisodes = useOfflineEpisodes({
    ...options,
    episodeId: episodeId ?? null,
    listFilters: false,
    readyOnly: false,
    bookmarkId: null,
  })
  const episode = offlineEpisodes.episodes?.[0] ?? null

  return {
    episode,
    episodeLoading: offlineEpisodes.episodesLoading,
    episodeError: offlineEpisodes.episodesError,
    reloadEpisode: offlineEpisodes.reloadEpisodes,
  }
}
