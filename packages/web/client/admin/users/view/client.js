/* eslint-env browser */
import { fetch } from 'fetch-undici'
import { Component, html, render, useEffect, useState, useCallback } from 'uland-isomorphic'
import { useUser } from '../../../hooks/useUser.js'
import { useLSP } from '../../../hooks/useLSP.js'
import { useWindow } from '../../../hooks/useWindow.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { userTable } from '../../../components/user-table/user-table.js'

export const page = Component(() => {
  const state = useLSP()
  const { user: activeUser, loading: activeUserLoading } = useUser()
  const window = useWindow()
  const [user, setUser] = useState(null)
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState(null)
  const [dataReload, setDataReload] = useState(0)

  useEffect(() => {
    if (!activeUser && !activeUserLoading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [activeUser, activeUserLoading])

  const reload = useCallback(() => {
    console.log(dataReload)
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  const handleDelete = useCallback(() => {
    const beforeString = new Date(user.created_at).valueOf()
    window.location.replace(`/admin/users/?after=${beforeString}`)
  })

  useEffect(() => {
    async function getUser () {
      setUserLoading(true)
      setUserError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/admin/users/')
      }

      const requestParams = new URLSearchParams()

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
    }

    if (activeUser) {
      getUser()
        .then(() => { console.log('user done') })
        .catch(err => { console.error(err); setUserError(err) })
        .finally(() => { setUserLoading(false) })
    }
  }, [dataReload, state.apiUrl])

  const title = user?.username ? ['👨‍💻', user?.username] : []
  useTitle(...title)

  return html`
    <div>
      ${userLoading ? html`<div>...</div>` : null}
      ${userError ? html`<div>${userError.message}</div>` : null}
      ${user ? userTable({ users: [user], reload, onDelete: handleDelete }) : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
