/* eslint-env browser */
import { html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { fetch } from 'fetch-undici'
import { useLSP } from '../hooks/useLSP.js'
import { useWindow } from '../hooks/useWindow.js'
import { bookmark } from '../components/bookmark.js'

export function bookmarksPage () {
  const state = useLSP()
  const { user, loading } = useUser()
  const [bookmarks, setBookmarks] = useState()
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [bookmarksError, setBookmarksError] = useState(null)
  const [dataReload] = useState(0)
  const [before, setBefore] = useState()
  const [after, setAfter] = useState()
  const window = useWindow()

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  useEffect(() => {
    const controller = new AbortController()

    async function getBookmarks () {
      console.log('getting bookmarks')
      setBookmarksLoading(true)
      setBookmarksError(null)
      const pageParams = new URLSearchParams(window.location.search)

      if (pageParams.get('before')) pageParams.set('before', (new Date(+pageParams.get('before'))).toISOString())
      if (pageParams.get('after')) pageParams.set('after', (new Date(+pageParams.get('after'))).toISOString())

      const response = await fetch(`${state.apiUrl}/bookmarks?${pageParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        },
        signal: controller.signal,
        credentials: 'include'
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setBookmarks(body?.data)
        setBefore(body?.pagination?.before ? new Date(body?.pagination?.before) : null)
        setAfter(body?.pagination?.after ? new Date(body?.pagination?.after) : null)
        if (body?.pagination?.top) {
          const newParams = new URLSearchParams(window.location.search)
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
            window.history.replaceState(null, null, qs ? `.?${qs}` : '.')
          }
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getBookmarks()
        .then(() => { console.log('bookmarks done') })
        .catch(err => { console.error(err); setBookmarksError(err) })
        .finally(() => { setBookmarksLoading(false) })
    }
  }, [dataReload])

  return html`
    <div>
      🔖 <a href="./add">add +</a>
    </div>
    ${bookmarksLoading ? html`<div>Loading...</div>` : null}
    ${bookmarksError ? html`<div>${bookmarksError.message}</div>` : null}
    ${Array.isArray(bookmarks)
      ? bookmarks.map(b => html.for(b, b.id)`${bookmark({ bookmark: b })}`)
  : null}
  <div>
    ${before ? html`<a href=${'./?' + new URLSearchParams(`before=${before.valueOf()}`)}>earlier</a>` : null}
    ${after ? html`<a href=${'./?' + new URLSearchParams(`after=${after.valueOf()}`)}>later</span>` : null}
  <div>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), bookmarksPage)
}
