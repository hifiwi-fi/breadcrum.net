/// <reference lib="dom" />

/**
 * @import { TypeAuthTokenReadClient } from '../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query'
 */

import { useCallback, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useSearchParams } from './useQuery.js'
import { useLSP } from './useLSP.js'

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
  const { params: queryParams, setParams } = useSearchParams(['before', 'after', 'per_page', 'sort'])
  const queryClient = useQueryClient()
  const beforeParam = queryParams['before']
  const afterParam = queryParams['after']
  const perPageParam = queryParams['per_page']
  const sortParam = queryParams['sort']

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (beforeParam) params.set('before', beforeParam)
    if (afterParam) params.set('after', afterParam)
    if (perPageParam) params.set('per_page', perPageParam)
    if (sortParam) params.set('sort', sortParam)
    return params.toString()
  }, [afterParam, beforeParam, perPageParam, sortParam])
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
          accept: 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        if (body?.pagination?.top) {
          setParams({ before: null, after: null })
        }
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

  const { data, error, isPending } = authTokensQuery

  const reloadAuthTokens = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['auth-tokens', user?.id ?? null, state.apiUrl] })
  }, [queryClient, state.apiUrl, user?.id])

  const tokens = data?.tokens ?? null
  const before = data?.before ?? null
  const after = data?.after ?? null
  const tokensError = error || null
  const tokensLoading = isPending

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(queryString)
    beforeParams.set('before', before)
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(queryString)
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
