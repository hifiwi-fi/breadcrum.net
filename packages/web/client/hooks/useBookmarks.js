/// <reference lib="dom" />

/**
 * @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js';
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query'
 */

import { useCallback, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useSearchParamsAll, useSearchParams } from './useSearchParms.js'
import { useLSP } from './useLSP.js'

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
  const { searchParamsAll } = useSearchParamsAll()
  const { setParams } = useSearchParams(['before', 'after'])

  const queryString = useMemo(() => (searchParamsAll ? searchParamsAll.toString() : ''), [searchParamsAll])
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
          accept: 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        const top = Boolean(body?.pagination?.top)

        if (top) {
          const hasBefore = pageParams.get('before')
          const hasAfter = pageParams.get('after')
          if (hasBefore || hasAfter) {
            setParams({ before: null, after: null })
          }
        }

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
    beforeParams = new URLSearchParams(searchParamsAll ?? '')
    beforeParams.set('before', String(before.valueOf()))
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
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
