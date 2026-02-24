/// <reference lib="dom" />

/** @import { SchemaTypeAdminUserReadClient } from '../../routes/api/admin/users/schemas/schema-admin-user-read.js' */
/** @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query' */

import { useEffect, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useSearchParams } from './useSearchParams.js'
import { useLSP } from './useLSP.js'

/**
 * @typedef {object} AdminUsersQueryData
 * @property {SchemaTypeAdminUserReadClient[] | undefined} users
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 */

export function useAdminUsers () {
  const { user } = useUser()
  const state = useLSP()
  const { params: queryParams, setParams } = useSearchParams(['before', 'after', 'per_page', 'username'])
  const beforeParam = queryParams['before']
  const afterParam = queryParams['after']
  const perPageParam = queryParams['per_page']
  const usernameParam = queryParams['username']

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (beforeParam) params.set('before', beforeParam)
    if (afterParam) params.set('after', afterParam)
    if (perPageParam) params.set('per_page', perPageParam)
    if (usernameParam) params.set('username', usernameParam)
    return params.toString()
  }, [afterParam, beforeParam, perPageParam, usernameParam])
  const queryKey = useMemo(() => ([
    'admin-users',
    user?.id ?? null,
    state.apiUrl,
    queryString,
  ]), [queryString, state.apiUrl, user?.id])

  /** @type {UseQueryResult<AdminUsersQueryData, Error>} */
  const adminUsersQuery = useTanstackQuery(/** @type {UseQueryOptions<AdminUsersQueryData, Error>} */ ({
    queryKey,
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    /**
     * @param {{ signal: AbortSignal }} context
     * @returns {Promise<AdminUsersQueryData>}
     */
    queryFn: async ({ signal }) => {
      const pageParams = new URLSearchParams(queryString)

      // Transform date string to ISO for API
      const beforeParam = pageParams.get('before')
      if (beforeParam) pageParams.set('before', (new Date(+beforeParam)).toISOString())
      const afterParam = pageParams.get('after')
      if (afterParam) pageParams.set('after', (new Date(+afterParam)).toISOString())

      const response = await fetch(`${state.apiUrl}/admin/users?${pageParams.toString()}`, {
        method: 'get',
        headers: {
          accept: 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        return {
          users: body?.data,
          before: body?.pagination?.before ? new Date(body?.pagination?.before) : null,
          after: body?.pagination?.after ? new Date(body?.pagination?.after) : null,
          top: Boolean(body?.pagination?.top),
        }
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data, error, isPending } = adminUsersQuery

  // Cursor cleanup: when the server signals we're at the first page, remove stale
  // before/after params from the URL. Runs in an effect (not queryFn) to keep
  // queryFn pure. setParams is idempotent — no-op if params already absent.
  useEffect(() => {
    if (data?.top) {
      setParams({ before: null, after: null })
    }
  }, [data, setParams])

  const users = data?.users
  const before = data?.before ?? null
  const after = data?.after ?? null
  const usersError = error || null
  const usersLoading = isPending

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(queryString)
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(queryString)
    afterParams.set('after', after.valueOf().toString())
    afterParams.delete('before')
  }

  return {
    usersLoading,
    usersError,
    users,
    before,
    after,
    beforeParams,
    afterParams
  }
}
