/* eslint-env browser */
import { Component, html, render, useEffect, useState, useCallback } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { bookmarkList } from '../../components/bookmark/bookmark-list.js'
import { useTitle } from '../../hooks/useTitle.js'
import { search } from '../../components/search/index.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const [bookmark, setBookmark] = useState(null)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [bookmarkError, setBookmarkError] = useState(null)
  const [dataReload, setDataReload] = useState(0)

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  const reload = useCallback(() => {
    console.log(dataReload)
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  const handleDelete = useCallback(() => {
    const beforeString = new Date(bookmark.created_at).valueOf()
    window.location.replace(`/bookmarks?after=${beforeString}`)
  })

  useEffect(() => {
    async function getBookmark () {
      setBookmarkLoading(true)
      setBookmarkError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/bookmarks')
      }

      const requestParams = new URLSearchParams()

      requestParams.set('sensitive', state.sensitive)

      const response = await fetch(`${state.apiUrl}/bookmarks/${id}?${requestParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setBookmark(body)
      } else {
        setBookmark(null)
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getBookmark()
        .then(() => { console.log('bookmarks done') })
        .catch(err => { console.error(err); setBookmarkError(err) })
        .finally(() => { setBookmarkLoading(false) })
    }
  }, [dataReload, state.apiUrl, state.sensitive])

  const title = bookmark?.title ? ['🔖', bookmark?.title] : []
  useTitle(...title)

  const handleSearch = useCallback((query) => {
    window.location.replace(`/search/bookmarks/?query=${encodeURIComponent(query)}`)
  }, [window])

  return html`
    <div>
      ${search({
        placeholder: 'Search Bookmarks...',
        onSearch: handleSearch,
      })}
      ${bookmarkLoading ? html`<div>...</div>` : null}
      ${bookmarkError ? html`<div>${bookmarkError.message}</div>` : null}
      ${bookmark ? bookmarkList({ bookmark, reload, onDelete: handleDelete }) : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
