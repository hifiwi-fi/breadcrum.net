/// <reference lib="dom" />

/**
 * @import { TypeAuthTokenReadClient } from '../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query'
 */

import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useQuery } from './useQuery.js'
import { useLSP } from './useLSP.js'
import { useWindow } from './useWindow.js'

/**
 * @typedef {object} AuthTokensQueryData
 * @property {TypeAuthTokenReadClient[] | null} tokens
 * @property {string | null} before
 * @property {string | null} after
 * @property {boolean} top
 */

export function useAuthTokens () {
  const { user } = useUser({ required: false })
  const state = useLSP()
  const window = useWindow()
  const { query } = useQuery()
  const queryClient = useQueryClient()

  const queryString = useMemo(() => (query ? query.toString() : ''), [query])
  const queryKey = useMemo(() => ([
    'auth-tokens',
    user?.id ?? null,
    state.apiUrl,
    queryString,
  ]), [queryString, state.apiUrl, user?.id])

  /** @type {UseQueryResult<AuthTokensQueryData, Error>} */
  const authTokensQuery = useTanstackQuery(/** @type {UseQueryOptions<AuthTokensQueryData, Error>} */ ({
    queryKey,
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    /**
     * @param {{ signal: AbortSignal }} context
     * @returns {Promise<AuthTokensQueryData>}
     */
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams(queryString)

      const response = await fetch(`${state.apiUrl}/user/auth-tokens?${params.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        return {
          tokens: body?.data ?? null,
          before: body?.pagination?.before ?? null,
          after: body?.pagination?.after ?? null,
          top: Boolean(body?.pagination?.top),
        }
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data, error, isPending, status } = authTokensQuery
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

  const reloadAuthTokens = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['auth-tokens'] })
  }, [queryClient])

  const tokens = data?.tokens ?? null
  const before = data?.before ?? null
  const after = data?.after ?? null
  const tokensError = error || null
  const tokensLoading = isPending

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query ?? '')
    beforeParams.set('before', before)
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query ?? '')
    afterParams.set('after', after)
    afterParams.delete('before')
  }

  return {
    tokensLoading,
    tokensError,
    tokens,
    reloadAuthTokens,
    before,
    after,
    beforeParams,
    afterParams
  }
}
