/* eslint-env browser */
import { html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { fetch } from 'fetch-undici'
import { useLSP } from '../hooks/useLSP.js'

export function bookmarksPage () {
  const state = useLSP()
  const { user, loading } = useUser()
  const [bookmarks, setBookmarks] = useState()
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [bookmarksError, setBookmarksError] = useState(null)
  const [dataReload, setDataReload] = useState(0)

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  useEffect(() => {
    const controller = new AbortController()

    async function getBookmarks () {
      console.log('getting bookmarks')
      setBookmarksLoading(true)
      setBookmarksError(null)
      const response = await fetch(`${state.apiUrl}/bookmarks`, {
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
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), bookmarksPage)
}
