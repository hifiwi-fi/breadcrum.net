/* eslint-env browser */
import { Component, html, render, useEffect, useState, useCallback } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useQuery } from '../hooks/useQuery.js'
import { fetch } from 'fetch-undici'
import { useLSP } from '../hooks/useLSP.js'
import { useWindow } from '../hooks/useWindow.js'
import { bookmarkList } from '../components/bookmark/bookmark-list.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [bookmarks, setBookmarks] = useState()
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [bookmarksError, setBookmarksError] = useState(null)

  const [before, setBefore] = useState()
  const [after, setAfter] = useState()

  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  // Require a user
  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  // Load bookmarks
  useEffect(() => {
    const controller = new AbortController()

    async function getBookmarks () {
      // TODO: port SWR or use https://usehooks.com/useAsync/
      setBookmarksLoading(true)
      setBookmarksError(null)
      const pageParams = new URLSearchParams(query)

      // Transform date string to date object
      if (pageParams.get('before')) pageParams.set('before', (new Date(+pageParams.get('before'))).toISOString())
      if (pageParams.get('after')) pageParams.set('after', (new Date(+pageParams.get('after'))).toISOString())

      pageParams.set('sensitive', state.sensitive)

      // Be selective about this
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
          const newParams = new URLSearchParams(query)
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
  }, [query, state.apiUrl, state.sensitive, dataReload])

  const onPageNav = (ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    window.scrollTo({ top: 0 })
  }

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query)
    beforeParams.set('before', before.valueOf())
    beforeParams.delete('after')
  }

  let afterParms
  if (after) {
    afterParms = new URLSearchParams(query)
    afterParms.set('after', after.valueOf())
    afterParms.delete('before')
  }

  const tageFilterRemovedParams = new URLSearchParams(query)
  const tagFilter = tageFilterRemovedParams.get('tag')
  tageFilterRemovedParams.delete('tag')

  return html`
    <div>
      ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParms}>later</span>` : null}
    <div>
    <div>
      <span>🔖 <a href="./add">add +</a></span>
      ${tagFilter ? html`<span class='bc-tag-filter-remove'>🏷${tagFilter}<a onclick=${onPageNav} href=${`./?${tageFilterRemovedParams}`}><sub>⊖</sub></a></span>` : null}
    </div>
    ${bookmarksLoading && !Array.isArray(bookmarks) ? html`<div>...</div>` : null}
    ${bookmarksError ? html`<div>${bookmarksError.message}</div>` : null}
    ${Array.isArray(bookmarks)
      ? bookmarks.map(b => html.for(b, b.id)`${bookmarkList({ bookmark: b, reload })}`)
      : null}
  <div>
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParms}>later</span>` : null}
  <div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
