/// <reference lib="dom" />

/**
 * @import { TypeUserReadClient } from '../../routes/api/user/schemas/schema-user-read.js'
 */

/**
 * @typedef {Object} UseUserParams
 * @property {boolean} [required=true] - When true, redirects to login page if no user is authenticated
 */

import { useEffect } from 'preact/hooks'
import { useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from './useLSP.js'

/**
 * Hook for managing user authentication state.
 *
 * ## Architecture
 *
 * Auth state lives in cookies and is sent automatically with every request —
 * this hook never reads or writes cookies directly.
 *
 * LSP (localStorage) acts as a write-through cache for the user object:
 *   - On startup, `initialData` seeds TanStack from LSP to avoid a blank flash
 *     while the first fetch is in flight.
 *   - After each fetch, the sync effect writes the result back to LSP so it's
 *     ready for the next startup.
 *
 * TanStack Query is the single source of truth at runtime. All mutations that
 * change user data (login, logout, profile updates) should call
 * `queryClient.setQueryData(['user', apiUrl], ...)` so every subscriber
 * updates atomically. LSP will follow via the sync effect.
 *
 * Data flow:
 *   LSP ──(initialData, startup only)──▶ TanStack ──(sync effect)──▶ LSP
 *
 * TanStack deduplicates in-flight requests for the same key, so multiple
 * components calling useUser() share a single fetch — no singleton hack needed.
 *
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
    // Bootstrap from LSP on startup to avoid blank flash while the fetch is in flight.
    // LSP is write-through (see sync effect below), so this reflects the last known state.
    initialData: () => state.user ?? undefined,
  })

  // Sync TanStack data back into LSP so it's available as initialData on next startup
  useEffect(() => {
    if (data !== undefined) {
      state.user = data
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

  return {
    user: data ?? null,
    loading,
    error: error || null,
  }
}
