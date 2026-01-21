/// <reference lib="dom" />

/** @import { SchemaTypeAdminUserReadClient } from '../../routes/api/admin/users/schemas/schema-admin-user-read.js' */

import { useEffect, useState } from 'preact/hooks'
import { useUser } from './useUser.js'
import { useQuery } from './useQuery.js'
import { useLSP } from './useLSP.js'
import { useReload } from './useReload.js'

export function useAdminUsers () {
  const { user } = useUser()
  const state = useLSP()
  const { query } = useQuery()

  const [users, setUsers] = useState(/** @type {SchemaTypeAdminUserReadClient[] | undefined} */(undefined))
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(/** @type {Error | null} */(null))

  const [before, setBefore] = useState(/** @type {Date | null} */(null))
  const [after, setAfter] = useState(/** @type {Date | null} */(null))

  const { reload: reloadAdminUsers, signal: adminUsersReloadSignal } = useReload()

  // Load users
  useEffect(() => {
    async function getUsers () {
      setUsersLoading(true)
      setUsersError(null)
      const pageParams = new URLSearchParams(query || '')

      // Transform date string to date object
      const beforeParam = pageParams.get('before')
      if (beforeParam) pageParams.set('before', (new Date(+beforeParam)).toISOString())
      const afterParam = pageParams.get('after')
      if (afterParam) pageParams.set('after', (new Date(+afterParam)).toISOString())

      try {
        // Be selective about this
        const response = await fetch(`${state.apiUrl}/admin/users?${pageParams.toString()}`, {
          method: 'get',
          headers: {
            'accept-encoding': 'application/json',
          },
        })

        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const body = await response.json()
          setUsers(body?.data)
          setBefore(body?.pagination?.before ? new Date(body?.pagination?.before) : null)
          setAfter(body?.pagination?.after ? new Date(body?.pagination?.after) : null)
          if (body?.pagination?.top && window) {
            const newParams = new URLSearchParams(query || '')
            let modified = false
            if (newParams.get('before')) {
              newParams.delete('before')
              modified = true
            }
            if (newParams.get('after')) {
              newParams.delete('after')
              modified = true
            }

            if (modified) {
              const qs = newParams.toString()
              window.history.replaceState(null, '', qs ? `.?${qs}` : '.')
            }
          }
        } else {
          throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
        }
      } catch (err) {
        console.error(err)
        setUsersError(/** @type {Error} */(err))
      } finally {
        setUsersLoading(false)
      }
    }

    if (user) {
      getUsers()
        .then(() => { console.log('users done') })
        .catch(err => {
          console.error(err)
          setUsersError(/** @type {Error} */(err))
        })
        .finally(() => { setUsersLoading(false) })
    }
  }, [query, state.apiUrl, adminUsersReloadSignal, user?.id])

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query || '')
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query || '')
    afterParams.set('after', after.valueOf().toString())
    afterParams.delete('before')
  }

  return {
    usersLoading,
    usersError,
    users,
    reloadAdminUsers,
    before,
    after,
    beforeParams,
    afterParams
  }
}
