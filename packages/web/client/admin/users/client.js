/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeAdminUserRead } from '../../../routes/api/admin/users/schema-admin-user-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState, useCallback } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { UserTable } from '../../components/user-table/user-table.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [users, setUsers] = useState(/** @type {TypeAdminUserRead[] | undefined} */(undefined))
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(/** @type {Error | null} */(null))

  const [before, setBefore] = useState(/** @type {Date | null} */(null))
  const [after, setAfter] = useState(/** @type {Date | null} */(null))

  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  // Require a user
  useEffect(() => {
    if ((!user && !loading) && window) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading, window])

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
  }, [query, state.apiUrl, dataReload, user, window])

  const onPageNav = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    if (window) {
      window.scrollTo({ top: 0 })
    }
  }, [pushState, window])

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

  return html`
    <div>
      ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
    </div>

    ${usersLoading && !Array.isArray(users) ? html`<div>...</div>` : null}
    ${usersError ? html`<div>${usersError.message}</div>` : null}
    ${Array.isArray(users)
      ? html`<${UserTable} users=${users} reload=${reload} onDelete=${reload} />`
      : null
    }

    <div>
      ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
