/// <reference lib="dom" />

import { useEffect } from 'preact/hooks'
import { useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useLSP } from './useLSP.js'

export function useFlags () {
  const state = useLSP()

  const { data: flags, isPending: loading, error } = useTanstackQuery({
    queryKey: ['flags', state.apiUrl],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/flags`, {
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
    },
  })

  // Sync fetched flags into LSP state outside of queryFn to keep queryFn pure.
  // The equality check prevents spurious state.flags mutations.
  useEffect(() => {
    if (flags && !localFlagsEqualServerFlags(state.flags, flags)) {
      console.log('Updating flag state')
      state.flags = flags
    }
  }, [flags, state])

  return { flags: flags ?? state.flags, loading, error: error || null }
}

/**
 * @param {Record<string, any>} localFlags
 * @param {Record<string, any>} serverFlags
 * @returns {boolean}
 */
function localFlagsEqualServerFlags (localFlags, serverFlags) {
  for (const [k, v] of Object.entries(serverFlags)) {
    if (localFlags[k] !== v) return false
  }

  return true
}
