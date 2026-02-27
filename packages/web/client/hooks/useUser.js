/// <reference lib="dom" />

/**
 * @import { TypeUserReadClient } from '../../routes/api/user/schemas/schema-user-read.js'
 */

/**
 * @typedef {Object} UseUserParams
 * @property {boolean} [required=true] - When true, redirects to login page if no user is authenticated
 */

import { useEffect, useCallback } from 'preact/hooks'
import { useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from './useLSP.js'

/**
 * Hook for managing user authentication state.
 * TanStack Query deduplicates in-flight requests for the same key, so multiple
 * components calling useUser() share a single fetch — no singleton hack needed.
 * @param {UseUserParams} [params]
 */
export function useUser ({
  required
} = {
  required: true
}) {
  const state = useLSP()
  const queryClient = useQueryClient()

  const { data, isPending: loading, error } = useTanstackQuery({
    queryKey: ['user', state.apiUrl],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/user`, {
        method: 'get',
        headers: {
          accept: 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        /** @type {TypeUserReadClient} */
        const body = await response.json()
        return body
      }

      if (response.status === 401) {
        return null
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
  })

  // Sync fetched user into LSP state for parts of the app that read state.user directly
  useEffect(() => {
    if (data !== undefined) {
      if (data === null) {
        if (state.user) state.user = null
      } else {
        for (const k of Object.keys(data)) {
          if (state.user?.[/** @type {keyof TypeUserReadClient} */ (k)] !== data[/** @type {keyof TypeUserReadClient} */ (k)]) {
            console.log('Updating user state')
            state.user = data
            break
          }
        }
      }
    }
  }, [data])

  // Redirect to login when required and no user is authenticated
  useEffect(() => {
    if (!data && !loading && window && required) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [data, loading, required])

  // Re-fetch on back navigation (bfcache restore)
  // TODO: set cache header correctly for authenticated pages and remove this
  useEffect(() => {
    /** @param {PageTransitionEvent} event */
    function pageNavHandler (event) {
      if (event.persisted) {
        console.log('refreshing state')
        queryClient.invalidateQueries({ queryKey: ['user', state.apiUrl] })
      }
    }
    window.addEventListener('pageshow', pageNavHandler)
    return () => {
      window.removeEventListener('pageshow', pageNavHandler)
    }
  }, [queryClient, state.apiUrl])

  const reloadUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user', state.apiUrl] })
  }, [queryClient, state.apiUrl])

  return {
    user: data ?? state.user,
    reloadUser,
    loading,
    error: error || null,
  }
}
