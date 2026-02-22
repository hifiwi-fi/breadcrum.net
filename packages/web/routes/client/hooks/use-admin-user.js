/// <reference lib="dom" />

/** @import { SchemaTypeAdminUserReadClient } from '../../api/admin/users/schemas/schema-admin-user-read.js' */

import { useEffect, useState } from 'preact/hooks'
import { useUser } from './useUser.js'
import { useLSP } from './useLSP.js'
import { useReload } from './useReload.js'
import { useWindow } from './useWindow.js'

/**
 * Hook for fetching a single admin user by ID
 * @param {string | null} userId - The user ID to fetch
 */
export function useAdminUser (userId) {
  const { user: activeUser } = useUser()
  const state = useLSP()
  const window = useWindow()

  const [user, setUser] = useState(/** @type {SchemaTypeAdminUserReadClient | null} */(null))
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState(/** @type {Error | null} */(null))

  const { reload: reloadAdminUser, signal: adminUserReloadSignal } = useReload()

  // Load user
  useEffect(() => {
    async function getUser () {
      if (!userId) return

      setUserLoading(true)
      setUserError(null)

      const requestParams = new URLSearchParams()

      try {
        const response = await fetch(`${state.apiUrl}/admin/users/${userId}?${requestParams.toString()}`, {
          method: 'get',
          headers: {
            'accept-encoding': 'application/json',
          },
        })

        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const body = await response.json()
          setUser(body)
        } else {
          setUser(null)
          throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
        }
      } catch (err) {
        console.error(err)
        setUserError(/** @type {Error} */(err))
      } finally {
        setUserLoading(false)
      }
    }

    if (activeUser && userId) {
      getUser()
        .then(() => { console.log('user done') })
        .catch(err => {
          console.error(err)
          setUserError(/** @type {Error} */(err))
        })
        .finally(() => { setUserLoading(false) })
    }
  }, [userId, state.apiUrl, adminUserReloadSignal, activeUser?.id])

  /**
   * Handle user deletion by redirecting to users list
   */
  const handleDelete = () => {
    if (user && window) {
      const beforeString = new Date(user.created_at).valueOf()
      window.location.replace(`/admin/users/?after=${beforeString}`)
    }
  }

  return {
    userLoading,
    userError,
    user,
    reloadAdminUser,
    handleDelete
  }
}
