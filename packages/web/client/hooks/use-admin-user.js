/// <reference lib="dom" />

/** @import { SchemaTypeAdminUserReadClient } from '../../routes/api/admin/users/schemas/schema-admin-user-read.js' */
/** @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query' */

import { useCallback, useMemo } from 'preact/hooks'
import { useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useLSP } from './useLSP.js'
import { useWindow } from './useWindow.js'

/**
 * Hook for fetching a single admin user by ID
 * @param {string | null} userId - The user ID to fetch
 */
export function useAdminUser (userId) {
  const { user: activeUser } = useUser()
  const state = useLSP()
  const window = useWindow()

  const queryKey = useMemo(() => ([
    'admin-user',
    userId,
    state.apiUrl,
  ]), [userId, state.apiUrl])

  /** @type {UseQueryResult<SchemaTypeAdminUserReadClient | null, Error>} */
  const adminUserQuery = useTanstackQuery(/** @type {UseQueryOptions<SchemaTypeAdminUserReadClient | null, Error>} */ ({
    queryKey,
    enabled: Boolean(activeUser && userId),
    /**
     * @param {{ signal: AbortSignal }} context
     * @returns {Promise<SchemaTypeAdminUserReadClient | null>}
     */
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/admin/users/${userId}`, {
        method: 'get',
        headers: {
          accept: 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        return response.json()
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }))

  const { data: user, error: userError, isPending: userLoading } = adminUserQuery

  /**
   * Handle user deletion by redirecting to users list
   */
  const handleDelete = useCallback(() => {
    if (user && window) {
      const beforeString = new Date(user.created_at).valueOf()
      window.location.replace(`/admin/users/?after=${beforeString}`)
    }
  }, [user, window])

  return {
    userLoading,
    userError: userError || null,
    user: user ?? null,
    handleDelete
  }
}
