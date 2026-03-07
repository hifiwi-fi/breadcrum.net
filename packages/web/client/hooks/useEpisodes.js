/// <reference lib="dom" />

/**
 * @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js'
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query'
 */

import { useCallback, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useSearchParamsAll, useSearchParams } from './useSearchParms.js'
import { useLSP } from './useLSP.js'

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

  const queryString = useMemo(() => (searchParamsAll ? searchParamsAll.toString() : ''), [searchParamsAll])
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
    beforeParams = new URLSearchParams(searchParamsAll ?? '')
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
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
