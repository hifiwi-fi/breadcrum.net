/// <reference lib="dom" />

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
        const body = await response.json()
        if (!localFlagsEqualServerFlags(state.flags, body)) {
          console.log('Updating flag state')
          state.flags = body
        }
        return body
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
  })

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
