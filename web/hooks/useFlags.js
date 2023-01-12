/* eslint-env browser */
import { fetch } from 'fetch-undici'
import { useEffect, useState } from 'uland-isomorphic'
import { useLSP } from './useLSP.js'

export function useFlags() {
  const state = useLSP()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const controller = new AbortController()

    const getFlags = async () => {
      const response = await fetch(`${state.apiUrl}/flags`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        },
        signal: controller.signal
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        if (!localFlagsEqualServerFlags(state.flags, body)) {
          console.log('Updating flag state')
          state.flags = body
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    getFlags().catch(err => {
      console.error(err)
      setError(err)
    }).finally(() => {
      setLoading(false)
    })
  }, [state.apiUrl])
  return { flags: state.flags, loading, error }
}

function localFlagsEqualServerFlags(localFlags, serverFlags) {
  for (const [k, v] of Object.entries(serverFlags)) {
    if (localFlags[k] !== v) return false
  }

  return true
}
