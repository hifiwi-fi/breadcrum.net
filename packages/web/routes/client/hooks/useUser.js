/// <reference lib="dom" />

/**
 * @import { TypeUserReadClient } from '../../api/user/schemas/schema-user-read.js'
 */

/**
 * @typedef {Object} UseUserParams
 * @property {boolean} [required=true] - When true, redirects to login page if no user is authenticated
 */

import { useEffect, useState } from 'preact/hooks'
import { useLSP } from './useLSP.js'
import { useReload } from './useReload.js'

/** @type {Promise<Response> | null} */
let userRequest = null

/**
 * Hook for managing user authentication state
 * @param {UseUserParams} [params]
 */
export function useUser ({
  required
} = {
  required: true
}) {
  const state = useLSP()
  const { reload: reloadUser, signal: reloadUserSignal } = useReload()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type{Error | null} */(null))

  useEffect(() => {
    // TODO: set cache header correctly for authenticated pages and remove this

    // Refresh the page on back nav
    /** @param {PageTransitionEvent} event */
    function pageNavHandler (event) {
      if (event.persisted) {
        console.log('refreshing state')
        reloadUser()
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
        /** @type {TypeUserReadClient} */
        const body = await clone.json()
        for (const k of Object.keys(body)) {
          if (state.user?.[/** @type {keyof TypeUserReadClient} */ (k)] !== body[/** @type {keyof TypeUserReadClient} */ (k)]) {
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
  }, [state.apiUrl, reloadUserSignal])

  useEffect(() => {
    if ((!state.user && !loading) && window && required) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [state.user?.id, loading, required])

  return {
    user: state.user,
    reloadUser,
    reloadUserSignal,
    loading,
    error,
  }
}
