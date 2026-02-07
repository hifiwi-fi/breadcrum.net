/// <reference lib="dom" />

/**
 * @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js'
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
 */

import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery } from '@tanstack/react-query'
import { useUser } from './useUser.js'
import { useQuery } from './useQuery.js'
import { useLSP } from './useLSP.js'
import { useWindow } from './useWindow.js'

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
  const window = useWindow()
  const { query } = useQuery()

  const queryString = useMemo(() => (query ? query.toString() : ''), [query])
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
    enabled: Boolean(user) && enabled,
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
          'accept-encoding': 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        return {
          episodes: body?.data ?? null,
          before: body?.pagination?.before ? new Date(body?.pagination?.before) : null,
          after: body?.pagination?.after ? new Date(body?.pagination?.after) : null,
          top: Boolean(body?.pagination?.top),
        }
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data, error, isPending, refetch, status } = episodesQuery
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

  const reloadEpisodes = useCallback(async () => {
    await refetch()
  }, [refetch])

  const episodes = data?.episodes ?? null
  const before = data?.before ?? null
  const after = data?.after ?? null
  const episodesError = error
  const episodesLoading = isPending

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query ?? '')
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query ?? '')
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
