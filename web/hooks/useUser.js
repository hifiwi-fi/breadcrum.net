/* eslint-env browser */
import { useEffect, useState } from 'uland-isomorphic'
import { fetch } from 'fetch-undici'
import { useLSP } from './useLSP.js'

let userRequest = null

export function useUser ({
  reload
} = {}) {
  const state = useLSP()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const controller = new AbortController()

    let requestor = false

    const getUser = async () => {
      if (!userRequest) {
        userRequest = fetch(`${state.apiUrl}/user`, {
          method: 'get',
          headers: {
            'accept-encoding': 'application/json'
          },
          signal: controller.signal
        })
        requestor = true
      }

      const response = await userRequest

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const clone = response.clone()
        const body = await clone.json()
        for (const k of Object.keys(body)) {
          if (state.user?.[k] !== body[k]) {
            console.log('Updating user state')
            state.user = body
            break
          }
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
      if (requestor) userRequest = null
    })
  }, [state.apiUrl, reload])

  return {
    user: state.user,
    loading,
    error
  }
}
