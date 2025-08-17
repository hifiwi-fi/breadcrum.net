/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeAdminUserRead } from '../../../../routes/api/admin/users/schema-admin-user-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState, useCallback } from 'preact/hooks'
import { useUser } from '../../../hooks/useUser.js'
import { useLSP } from '../../../hooks/useLSP.js'
import { useWindow } from '../../../hooks/useWindow.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { UserTable } from '../../../components/user-table/user-table.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user: activeUser, loading: activeUserLoading } = useUser()
  const window = useWindow()
  const [user, setUser] = useState(/** @type {TypeAdminUserRead | null} */(null))
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState(/** @type {Error | null} */(null))
  const [dataReload, setDataReload] = useState(0)

  useEffect(() => {
    if ((!activeUser && !activeUserLoading) && window) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [activeUser, activeUserLoading, window])

  const reload = useCallback(() => {
    console.log(dataReload)
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  const handleDelete = useCallback(() => {
    if (user && window) {
      const beforeString = new Date(user.created_at).valueOf()
      window.location.replace(`/admin/users/?after=${beforeString}`)
    }
  }, [user, window])

  useEffect(() => {
    async function getUser () {
      if (!window) return

      setUserLoading(true)
      setUserError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/admin/users/')
        return
      }

      const requestParams = new URLSearchParams()

      try {
        const response = await fetch(`${state.apiUrl}/admin/users/${id}?${requestParams.toString()}`, {
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

    if (activeUser) {
      getUser()
        .then(() => { console.log('user done') })
        .catch(err => {
          console.error(err)
          setUserError(/** @type {Error} */(err))
        })
        .finally(() => { setUserLoading(false) })
    }
  }, [dataReload, state.apiUrl, activeUser, window])

  const title = user?.username ? ['👨‍💻', user?.username] : []
  useTitle(...title)

  return html`
    <div>
      ${userLoading ? html`<div>...</div>` : null}
      ${userError ? html`<div>${userError.message}</div>` : null}
      ${user ? html`<${UserTable} users=${[user]} reload=${reload} onDelete=${handleDelete} />` : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
