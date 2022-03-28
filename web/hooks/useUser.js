/* eslint-env browser */
import { useEffect, useState } from 'uland-isomorphic'
import { fetch } from 'fetch-undici'
import { useLSP } from './useLSP.js'

export function useUser () {
  const state = useLSP()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const controller = new AbortController()

    const getUser = async () => {
      const response = await fetch(`${state.apiUrl}/user`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        },
        signal: controller.signal,
        credentials: 'include'
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        if (body?.username !== state.user?.username || body?.email !== state.user?.email) {
          console.log('Updating user state')
          state.user = body
        }
      } else {
        if (response.status === 401) {
          if (state.user) state.user = null
        } else {
          throw new Error(`${(await response).status} ${(await response).statusText}: ${await response.text()}`)
        }
      }
    }

    getUser().catch(err => {
      console.error(err)
      setError(err)
    }).finally(() => {
      setLoading(false)
    })
  }, [state.apiUrl])

  return {
    user: state.user,
    loading,
    error
  }
}
