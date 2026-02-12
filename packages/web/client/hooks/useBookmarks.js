/// <reference lib="dom" />

/**
 * @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js';
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query'
 */

import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useQuery } from './useQuery.js'
import { useLSP } from './useLSP.js'
import { useWindow } from './useWindow.js'

/**
 * @typedef {object} BookmarksQueryData
 * @property {TypeBookmarkReadClient[] | null} bookmarks
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 */

export function useBookmarks () {
  const { user } = useUser({ required: false })
  const state = useLSP()
  const window = useWindow()
  const { query } = useQuery()

  const queryString = useMemo(() => (query ? query.toString() : ''), [query])
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
    enabled: Boolean(user),
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
          'accept-encoding': 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        return {
          bookmarks: body?.data ?? null,
          before: body?.pagination?.before ? new Date(body?.pagination?.before) : null,
          after: body?.pagination?.after ? new Date(body?.pagination?.after) : null,
          top: Boolean(body?.pagination?.top),
        }
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data, error, isPending, refetch, status } = bookmarksQuery
  const prevDataRef = useRef(data)
  const prevStatusRef = useRef(status)

  useEffect(() => {
    const dataChanged = data !== prevDataRef.current
    const statusChanged = status !== prevStatusRef.current

    if (window && status === 'success' && data !== undefined && (dataChanged || statusChanged)) {
      if (data.top) {
        const newParams = new URLSearchParams(queryString)
        let modified = false
        if (newParams.get('before')) {
          newParams.delete('before')
          modified = true
        }
        if (newParams.get('after')) {
          newParams.delete('after')
          modified = true
        }

        if (modified) {
          const qs = newParams.toString()
          window.history.replaceState(null, '', qs ? `.?${qs}` : '.')
        }
      }
    }

    prevDataRef.current = data
    prevStatusRef.current = status
  }, [data, queryString, status, window])

  const reloadBookmarks = useCallback(async () => {
    await refetch()
  }, [refetch])

  const bookmarks = data?.bookmarks ?? null
  const before = data?.before ?? null
  const after = data?.after ?? null
  const bookmarksError = error || null
  const bookmarksLoading = isPending

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query ?? '')
    beforeParams.set('before', String(before.valueOf()))
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query ?? '')
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
