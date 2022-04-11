/* eslint-env browser */
import { html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { fetch } from 'fetch-undici'
import { useLSP } from '../hooks/useLSP.js'
import { useWindow } from '../hooks/useWindow.js'

export function bookmarksPage () {
  const state = useLSP()
  const { user, loading } = useUser()
  const [bookmarks, setBookmarks] = useState()
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [bookmarksError, setBookmarksError] = useState(null)
  const [dataReload, setDataReload] = useState(0)
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
        setBefore(body?.pagination?.before)
        setAfter(body?.pagination?.after)
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

  async function deleteBookmark (id, ev) {
    console.log(id, ev)
    const controller = new AbortController()
    const response = await fetch(`${state.apiUrl}/bookmarks/${id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json'
      },
      signal: controller.signal,
      credentials: 'include'
    })
    setDataReload(dataReload + 1)
    console.log(await response.json())
  }

  return html`
    <div>
      <a href="./add">add +</a>
    </div>
    ${bookmarksLoading ? html`<div>Loading...</div>` : null}
    ${bookmarksError ? html`<div>${bookmarksError.message}</div>` : null}
    ${Array.isArray(bookmarks)
      ? bookmarks.map(b => html.for(b)`
      <div>
        <div>url: ${b.url}</div>
        <div>title: ${b.title}</div>
        <div>note: ${b.note}</div>
        <div>created at: ${b.created_at}</div>
        <div>updated at: ${b.updated_at}</div>
        <div>starred: ${b.starred}</div>
        <div>toread: ${b.toread}</div>
        <div>sensitive: ${b.sensitive}</div>
        <div>tags: ${b.tags}</div>
        <div><button onClick=${deleteBookmark.bind(null, b.id)}>delete</button></div>
      </div>
    `)
  : null}
  <div>
    ${before ? html`<a href=${'./?' + new URLSearchParams(`before=${before}`)}>earlier</a>` : null}
    ${after ? html`<a href=${'./?' + new URLSearchParams(`after=${after}`)}>later</span>` : null}
  <div>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), bookmarksPage)
}
