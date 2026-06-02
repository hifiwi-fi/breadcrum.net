/// <reference lib="dom" />

/**
 * @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js'
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query'
 * @import { OfflineRefetchTarget } from './useOfflineReadSync.js'
 */

import { useCallback, useEffect, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useLiveQuery } from '@tanstack/react-db'
import { useUser } from './useUser.js'
import { useSearchParamsAll, useSearchParams } from './useSearchParams.js'
import { useLSP } from './useLSP.js'
import { useOnlineStatus } from './useOnlineStatus.js'
import { getBookmarksCollection } from '../lib/offline/bookmarks-collection.js'
import { refetchOfflineTarget } from './useOfflineReadSync.js'
import { deriveOfflineEpisodes } from './useOfflineEpisodes.js'

/**
 * @typedef {object} EpisodesQueryData
 * @property {TypeEpisodeReadClient[] | null} episodes
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 */

/**
 * @param {{ enabled?: boolean }} [options]
 */
export function useEpisodes (options = {}) {
  const { enabled = true } = options
  const { user } = useUser({ required: false })
  const state = useLSP()
  const { searchParamsAll } = useSearchParamsAll()
  const { setParams } = useSearchParams(['before', 'after'])
  const online = useOnlineStatus()

  const queryString = useMemo(() => (searchParamsAll ? searchParamsAll.toString() : ''), [searchParamsAll])
  const offlineDbEnabled = useMemo(() => {
    const params = new URLSearchParams(queryString)
    return params.get('offline_db_spike') === 'true'
  }, [queryString])
  const useOfflineData = offlineDbEnabled && !online
  const queryKey = useMemo(() => ([
    'episodes',
    user?.id ?? null,
    state.apiUrl,
    state.sensitive,
    queryString,
  ]), [queryString, state.apiUrl, state.sensitive, user?.id])

  /** @type {UseQueryResult<EpisodesQueryData, Error>} */
  const episodesQuery = useTanstackQuery(/** @type {UseQueryOptions<EpisodesQueryData, Error>} */ ({
    queryKey,
    enabled: Boolean(user) && enabled && !useOfflineData,
    placeholderData: keepPreviousData,
    /**
     * @param {{ signal: AbortSignal }} context
     * @returns {Promise<EpisodesQueryData>}
     */
    queryFn: async ({ signal }) => {
      const pageParams = new URLSearchParams(queryString)
      const requestParams = new URLSearchParams()

      // Transform date string to date object
      const beforeParam = pageParams.get('before')
      const afterParam = pageParams.get('after')
      if (beforeParam) requestParams.set('before', (new Date(+beforeParam)).toISOString())
      if (afterParam) requestParams.set('after', (new Date(+afterParam)).toISOString())
      const bidParam = pageParams.get('bid')
      if (bidParam) requestParams.set('bookmark_id', bidParam)

      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('include_feed', 'true')

      const response = await fetch(`${state.apiUrl}/episodes?${requestParams.toString()}`, {
        method: 'get',
        headers: {
          accept: 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        const top = Boolean(body?.pagination?.top)

        return {
          episodes: body?.data ?? null,
          before: body?.pagination?.before ? new Date(body?.pagination?.before) : null,
          after: body?.pagination?.after ? new Date(body?.pagination?.after) : null,
          top,
        }
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data, error, isPending, refetch } = episodesQuery
  const offlineBookmarkId = useMemo(() => {
    const params = new URLSearchParams(queryString)
    return params.get('bid')
  }, [queryString])
  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: offlineDbEnabled && user ? user.id : null,
    sensitive: state.sensitive,
    toread: false,
    starred: false,
  }), [offlineDbEnabled, state.apiUrl, state.sensitive, user])
  const {
    data: offlineBookmarks,
    isLoading: offlineLoading,
    isError: offlineError,
  } = useLiveQuery(
    (query) => query.from({ bookmark: bookmarksCollection }),
    [bookmarksCollection]
  )
  const offlineEpisodes = useMemo(() => {
    if (!offlineDbEnabled) return null
    return deriveOfflineEpisodes(offlineBookmarks, { bookmarkId: offlineBookmarkId })
  }, [offlineBookmarkId, offlineBookmarks, offlineDbEnabled])
  const reloadOfflineEpisodes = useCallback(async () => {
    const refetchTarget = /** @type {OfflineRefetchTarget} */ (/** @type {unknown} */ (bookmarksCollection))
    await refetchOfflineTarget(refetchTarget)
  }, [bookmarksCollection])

  // Cursor cleanup: when the server signals we're at the first page, remove stale
  // before/after params from the URL. Runs in an effect (not queryFn) to keep
  // queryFn pure. setParams is idempotent — no-op if params already absent.
  useEffect(() => {
    if (data?.top) {
      setParams({ before: null, after: null })
    }
  }, [data, setParams])

  const reloadEpisodes = useCallback(async () => {
    if (useOfflineData) {
      await reloadOfflineEpisodes()
      return
    }

    await refetch()
  }, [refetch, reloadOfflineEpisodes, useOfflineData])

  useEffect(() => {
    if (!enabled || !offlineDbEnabled || !online || !user) return

    let cancelled = false

    reloadOfflineEpisodes().catch(err => {
      if (!cancelled) {
        console.error('Offline episodes sync failed:', err)
      }
    })

    return () => {
      cancelled = true
    }
  }, [enabled, offlineDbEnabled, online, reloadOfflineEpisodes, user])

  useEffect(() => {
    if (!enabled || !online || !user || typeof window === 'undefined') return

    let cancelled = false
    const revalidate = () => {
      if (cancelled) return

      /** @type {Array<Promise<unknown>>} */
      const tasks = [refetch()]
      if (offlineDbEnabled) tasks.push(reloadOfflineEpisodes())

      Promise.all(tasks).catch(err => {
        if (!cancelled) {
          console.error('Episodes revalidation failed:', err)
        }
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') revalidate()
    }

    window.addEventListener('pageshow', revalidate)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('pageshow', revalidate)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, offlineDbEnabled, online, refetch, reloadOfflineEpisodes, user])

  const episodes = useOfflineData ? offlineEpisodes : data?.episodes ?? null
  const before = useOfflineData ? null : data?.before ?? null
  const after = useOfflineData ? null : data?.after ?? null
  const episodesError = useOfflineData
    ? offlineError ? new Error('Offline episodes sync failed') : null
    : error
  const episodesLoading = useOfflineData ? offlineLoading : isPending

  let beforeParams
  if (!useOfflineData && before) {
    beforeParams = new URLSearchParams(searchParamsAll ?? '')
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (!useOfflineData && after) {
    afterParams = new URLSearchParams(searchParamsAll ?? '')
    afterParams.set('after', after.valueOf().toString())
    afterParams.delete('before')
  }

  return {
    episodes,
    episodesLoading,
    episodesError,
    reloadEpisodes,
    before,
    after,
    beforeParams,
    afterParams,
  }
}
