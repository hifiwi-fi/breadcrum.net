/// <reference lib="dom" />

/* eslint-env browser */

/**
 * @import { TypeUserRead } from '../../routes/api/user/schemas/schema-user-read.js'
 */

// @ts-expect-error
import { useEffect, useState } from 'uland-isomorphic'
import { useLSP } from './useLSP.js'

/** @type {Promise<Response> | null} */
let userRequest = null

/**
 * @param {{
 *   reload?: number
 * }} [params]
 */
export function useUser ({
  reload,
} = {}) {
  const state = useLSP()

  /** @type {[boolean, (loadingState: boolean) => void]} */
  const [loading, setLoading] = useState(false)
  /** @type {[Error | null, (error: Error | null) => void]} */
  const [error, setError] = useState(null)
  /** @type {[number, (dataRefresh: number) => void]} */
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    // TODO: set cache header correctly for authenticated pages and remove this

    // Refresh the page on back nav
    /** @param {PageTransitionEvent} event */
    function pageNavHandler (event) {
      if (event.persisted) {
        console.log('refreshing state')
        setRefresh(refresh + 1)
      }
    }
    window.addEventListener('pageshow', pageNavHandler)
    return () => {
      window.removeEventListener('pageshow', pageNavHandler)
    }
  })

  useEffect(() => {
    setLoading(true)
    setError(null)

    let requestor = false

    const getUser = async () => {
      if (!userRequest) {
        userRequest = fetch(`${state.apiUrl}/user`, {
          method: 'get',
          headers: {
            'accept-encoding': 'application/json',
          },
        })
        requestor = true
      }

      const response = await userRequest

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const clone = response.clone()
        /** @type {TypeUserRead} */
        const body = await clone.json()
        for (const k of Object.keys(body)) {
          if (state.user?.[/** @type {keyof TypeUserRead} */ (k)] !== body[/** @type {keyof TypeUserRead} */ (k)]) {
            console.log('Updating user state')
            state.user = body
            break
          }
        }
      } else {
        if (response.status === 401) {
          if (state.user) state.user = null
        } else {
          throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
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
  }, [state.apiUrl, reload, refresh])

  return {
    user: state.user,
    loading,
    error,
  }
}
