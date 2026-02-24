/// <reference lib="dom" />

/** @import { SchemaTypeAdminUserReadClient } from '../../routes/api/admin/users/schemas/schema-admin-user-read.js' */
/** @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query' */

import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useQuery } from './useQuery.js'
import { useLSP } from './useLSP.js'
import { useWindow } from './useWindow.js'

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
  const window = useWindow()
  const { query } = useQuery()
  const queryClient = useQueryClient()

  const queryString = useMemo(() => (query ? query.toString() : ''), [query])
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
          'accept-encoding': 'application/json',
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

  const { data, error, isPending, status } = adminUsersQuery
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

  const reloadAdminUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }, [queryClient])

  const users = data?.users
  const before = data?.before ?? null
  const after = data?.after ?? null
  const usersError = error || null
  const usersLoading = isPending

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query || '')
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query || '')
    afterParams.set('after', after.valueOf().toString())
    afterParams.delete('before')
  }

  return {
    usersLoading,
    usersError,
    users,
    reloadAdminUsers,
    before,
    after,
    beforeParams,
    afterParams
  }
}
