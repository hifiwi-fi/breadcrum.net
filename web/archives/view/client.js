/* eslint-env browser */
import { Component, html, render, useEffect, useState, useCallback } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useTitle } from '../../hooks/useTitle.js'
import { archiveList } from '../../components/archive/archive-list.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()

  const [archive, setArchive] = useState()
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState(null)

  const [archiveReload, setArchiveReload] = useState(0)

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  const reloadArchive = useCallback(() => {
    console.log(archiveReload)
    setArchiveReload(archiveReload + 1)
  }, [archiveReload, setArchiveReload])

  const handleDelete = useCallback(() => {
    window.location.replace(`/bookmarks/view?id=${archive.bookmark.id}`)
  }, [archive?.bookmark?.id])

  useEffect(() => {
    async function getArchive () {
      setArchiveLoading(true)
      setArchiveError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/archives')
        return
      }

      const requestParams = new URLSearchParams()

      requestParams.set('sensitive', state.sensitive)
      requestParams.set('full_archives', true)

      const response = await fetch(`${state.apiUrl}/archives/${id}?${requestParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        }
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setArchive(body)
      } else {
        setArchive(null)
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getArchive()
        .then(() => { console.log('archive done') })
        .catch(err => { console.error(err); setArchiveError(err) })
        .finally(() => { setArchiveLoading(false) })
    }
  }, [archiveReload, state.apiUrl, state.sensitive])

  const title = archive?.title ? ['🗄️', archive?.title] : []
  useTitle(...title)

  return html`
    <div>
      ${archiveLoading ? html`<div>...</div>` : null}
      ${archiveError ? html`<div>${archiveError.message}</div>` : null}
      ${archive ? archiveList({ archive, reload: reloadArchive, onDelete: handleDelete, fullView: true }) : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
