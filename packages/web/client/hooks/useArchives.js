/// <reference lib="dom" />

/**
 * @import { TypeArchiveReadClient } from '../../routes/api/archives/schemas/schema-archive-read.js'
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
import { deriveOfflineArchives } from './useOfflineArchives.js'

/**
 * @typedef {object} ArchivesQueryData
 * @property {TypeArchiveReadClient[] | null} archives
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 */

/**
 * @param {{ enabled?: boolean }} [options]
 */
export function useArchives (options = {}) {
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
    'archives',
    user?.id ?? null,
    state.apiUrl,
    state.sensitive,
    state.toread,
    state.starred,
    queryString,
  ]), [queryString, state.apiUrl, state.sensitive, state.starred, state.toread, user?.id])

  /** @type {UseQueryResult<ArchivesQueryData, Error>} */
  const archivesQuery = useTanstackQuery(/** @type {UseQueryOptions<ArchivesQueryData, Error>} */ ({
    queryKey,
    enabled: Boolean(user) && enabled && !useOfflineData,
    placeholderData: keepPreviousData,
    /**
     * @param {{ signal: AbortSignal }} context
     * @returns {Promise<ArchivesQueryData>}
     */
    queryFn: async ({ signal }) => {
      const pageParams = new URLSearchParams(queryString)
      const requestParams = new URLSearchParams()

      // Transform date string to date object
      const beforeParam = pageParams.get('before')
      const afterParam = pageParams.get('after')
      const bidParam = pageParams.get('bid')
      if (beforeParam) requestParams.set('before', (new Date(+beforeParam)).toISOString())
      if (afterParam) requestParams.set('after', (new Date(+afterParam)).toISOString())
      if (bidParam) requestParams.set('bookmark_id', bidParam)

      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('toread', state.toread.toString())
      requestParams.set('starred', state.starred.toString())
      requestParams.set('full_archives', 'false')
      requestParams.set('ready', 'true')

      const response = await fetch(`${state.apiUrl}/archives?${requestParams.toString()}`, {
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
          archives: body?.data ?? null,
          before: body?.pagination?.before ? new Date(body?.pagination?.before) : null,
          after: body?.pagination?.after ? new Date(body?.pagination?.after) : null,
          top,
        }
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data, error, isPending, refetch } = archivesQuery
  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: offlineDbEnabled && user ? user.id : null,
    sensitive: state.sensitive,
    toread: state.toread,
    starred: state.starred,
  }), [offlineDbEnabled, state.apiUrl, state.sensitive, state.starred, state.toread, user])
  const {
    data: offlineBookmarks,
    isLoading: offlineLoading,
    isError: offlineError,
  } = useLiveQuery(
    (query) => query.from({ bookmark: bookmarksCollection }),
    [bookmarksCollection]
  )
  const offlineArchives = useMemo(() => {
    if (!offlineDbEnabled) return null
    return deriveOfflineArchives(offlineBookmarks)
  }, [offlineBookmarks, offlineDbEnabled])
  const reloadOfflineArchives = useCallback(async () => {
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

  const reloadArchives = useCallback(async () => {
    if (useOfflineData) {
      await reloadOfflineArchives()
      return
    }

    await refetch()
  }, [refetch, reloadOfflineArchives, useOfflineData])

  useEffect(() => {
    if (!enabled || !offlineDbEnabled || !online || !user) return

    let cancelled = false

    reloadOfflineArchives().catch(err => {
      if (!cancelled) {
        console.error('Offline archives sync failed:', err)
      }
    })

    return () => {
      cancelled = true
    }
  }, [enabled, offlineDbEnabled, online, reloadOfflineArchives, user])

  useEffect(() => {
    if (!enabled || !online || !user || typeof window === 'undefined') return

    let cancelled = false
    const revalidate = () => {
      if (cancelled) return

      /** @type {Array<Promise<unknown>>} */
      const tasks = [refetch()]
      if (offlineDbEnabled) tasks.push(reloadOfflineArchives())

      Promise.all(tasks).catch(err => {
        if (!cancelled) {
          console.error('Archives revalidation failed:', err)
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
  }, [enabled, offlineDbEnabled, online, refetch, reloadOfflineArchives, user])

  const archives = useOfflineData ? offlineArchives : data?.archives ?? null
  const before = useOfflineData ? null : data?.before ?? null
  const after = useOfflineData ? null : data?.after ?? null
  const archivesError = useOfflineData
    ? offlineError ? new Error('Offline archives sync failed') : null
    : error
  const archivesLoading = useOfflineData ? offlineLoading : isPending

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
    archives,
    archivesLoading,
    archivesError,
    reloadArchives,
    before,
    after,
    beforeParams,
    afterParams,
  }
}
