/// <reference lib="dom" />

/**
 * @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js';
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

/**
 * @typedef {object} BookmarksQueryData
 * @property {TypeBookmarkReadClient[] | null} bookmarks
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 */

/**
 * @param {{ enabled?: boolean }} [options]
 */
export function useBookmarks (options = {}) {
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
    'bookmarks',
    user?.id ?? null,
    state.apiUrl,
    state.sensitive,
    state.toread,
    state.starred,
    queryString,
  ]), [queryString, state.apiUrl, state.sensitive, state.starred, state.toread, user?.id])

  /** @type {UseQueryResult<BookmarksQueryData, Error>} */
  const bookmarksQuery = useTanstackQuery(/** @type {UseQueryOptions<BookmarksQueryData, Error>} */ ({
    queryKey,
    enabled: Boolean(user) && enabled && !useOfflineData,
    placeholderData: keepPreviousData,
    /**
     * @param {{ signal: AbortSignal }} context
     * @returns {Promise<BookmarksQueryData>}
     */
    queryFn: async ({ signal }) => {
      const pageParams = new URLSearchParams(queryString)

      // Transform date string to date object
      const pagePramsBefore = pageParams.get('before')
      const pageParamsAfter = pageParams.get('after')
      if (pagePramsBefore) pageParams.set('before', (new Date(+pagePramsBefore)).toISOString())
      if (pageParamsAfter) pageParams.set('after', (new Date(+pageParamsAfter)).toISOString())

      pageParams.set('sensitive', state.sensitive.toString())
      pageParams.set('toread', state.toread.toString())
      pageParams.set('starred', state.starred.toString())

      const response = await fetch(`${state.apiUrl}/bookmarks?${pageParams.toString()}`, {
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
          bookmarks: body?.data ?? null,
          before: body?.pagination?.before ? new Date(body?.pagination?.before) : null,
          after: body?.pagination?.after ? new Date(body?.pagination?.after) : null,
          top,
        }
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data, error, isPending, refetch } = bookmarksQuery
  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: offlineDbEnabled && user ? user.id : null,
    sensitive: state.sensitive,
    toread: state.toread,
    starred: state.starred,
  }), [offlineDbEnabled, state.apiUrl, state.sensitive, state.starred, state.toread, user])
  const {
    data: offlineData,
    isLoading: offlineLoading,
    isError: offlineError,
  } = useLiveQuery(
    (query) => query.from({ bookmark: bookmarksCollection }),
    [bookmarksCollection]
  )

  const offlineBookmarks = useMemo(() => {
    if (!offlineDbEnabled || !Array.isArray(offlineData)) return null

    return [...offlineData].sort((a, b) => {
      const createdAtCompare = b.created_at.localeCompare(a.created_at)
      if (createdAtCompare !== 0) return createdAtCompare

      const titleCompare = (b.title ?? '').localeCompare(a.title ?? '')
      if (titleCompare !== 0) return titleCompare

      return b.url.localeCompare(a.url)
    })
  }, [offlineData, offlineDbEnabled])

  const reloadOfflineBookmarks = useCallback(async () => {
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

  const reloadBookmarks = useCallback(async () => {
    if (useOfflineData) {
      await reloadOfflineBookmarks()
      return
    }

    await refetch()
  }, [refetch, reloadOfflineBookmarks, useOfflineData])

  useEffect(() => {
    if (!enabled || !offlineDbEnabled || !online || !user) return

    let cancelled = false

    reloadOfflineBookmarks().catch(err => {
      if (!cancelled) {
        console.error('Offline bookmarks sync failed:', err)
      }
    })

    return () => {
      cancelled = true
    }
  }, [enabled, offlineDbEnabled, online, reloadOfflineBookmarks, user])

  useEffect(() => {
    if (!enabled || !online || !user || typeof window === 'undefined') return

    let cancelled = false
    const revalidate = () => {
      if (cancelled) return

      /** @type {Array<Promise<unknown>>} */
      const tasks = [refetch()]
      if (offlineDbEnabled) tasks.push(reloadOfflineBookmarks())

      Promise.all(tasks).catch(err => {
        if (!cancelled) {
          console.error('Bookmarks revalidation failed:', err)
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
  }, [enabled, offlineDbEnabled, online, refetch, reloadOfflineBookmarks, user])

  const bookmarks = useOfflineData ? offlineBookmarks : data?.bookmarks ?? null
  const before = useOfflineData ? null : data?.before ?? null
  const after = useOfflineData ? null : data?.after ?? null
  const bookmarksError = useOfflineData
    ? offlineError ? new Error('Offline bookmarks sync failed') : null
    : error || null
  const bookmarksLoading = useOfflineData ? offlineLoading : isPending

  let beforeParams
  if (!useOfflineData && before) {
    beforeParams = new URLSearchParams(searchParamsAll ?? '')
    beforeParams.set('before', String(before.valueOf()))
    beforeParams.delete('after')
  }

  let afterParams
  if (!useOfflineData && after) {
    afterParams = new URLSearchParams(searchParamsAll ?? '')
    afterParams.set('after', String(after.valueOf()))
    afterParams.delete('before')
  }

  return {
    bookmarksLoading,
    bookmarksError,
    bookmarks,
    reloadBookmarks,
    before,
    after,
    beforeParams,
    afterParams
  }
}
