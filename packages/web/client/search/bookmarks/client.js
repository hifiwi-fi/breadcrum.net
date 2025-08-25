/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useCallback, useState } from 'preact/hooks'
import { tc } from '../../lib/typed-component.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useUser } from '../../hooks/useUser.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { BookmarkList } from '../../components/bookmark/bookmark-list.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [bookmarks, setBookmarks] = useState(/** @type {TypeBookmarkReadClient[] | undefined} */(undefined))
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [bookmarksError, setBookmarksError] = useState(/** @type {Error | null} */(null))

  const [next, setNext] = useState(/** @type {any} */(undefined))
  const [prev, setPrev] = useState(/** @type {any} */(undefined))

  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  const pageParams = new URLSearchParams(query || '')

  // Search bookmarks
  useEffect(() => {
    async function getBookmarks () {
      console.log('loading bookmark results')
      setBookmarksLoading(true)
      setBookmarksError(null)

      const queryParams = new URLSearchParams()

      if (pageParams.get('per_page')) queryParams.set('per_page', pageParams.get('per_page') ?? '')
      queryParams.set('query', pageParams.get('query') ?? '')
      if (pageParams.get('id')) queryParams.set('id', pageParams.get('id') ?? '')
      if (pageParams.get('rank')) queryParams.set('rank', pageParams.get('rank') ?? '')
      if (pageParams.get('reverse')) queryParams.set('reverse', pageParams.get('reverse') ?? '')
      queryParams.set('sensitive', state.sensitive.toString())
      queryParams.set('toread', state.toread.toString())
      queryParams.set('starred', state.starred.toString())

      const response = await fetch(`${state.apiUrl}/search/bookmarks?${queryParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setBookmarks(body?.data)
        setNext(body?.pagination?.next)
        setPrev(body?.pagination?.prev)

        if (body?.pagination?.top && window) {
          const newParams = new URLSearchParams(query || '')
          let modified = false
          if (newParams.get('id')) {
            newParams.delete('id')
            modified = true
          }
          if (newParams.get('rank')) {
            newParams.delete('rank')
            modified = true
          }
          if (newParams.get('reverse')) {
            newParams.delete('reverse')
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
    }

    if (user) {
      getBookmarks()
        .then(() => { console.log('bookmarks done') })
        .catch(err => {
          console.error(err)
          setBookmarksError(/** @type {Error} */(err))
        })
        .finally(() => { setBookmarksLoading(false) })
    }
  }, [query, state.apiUrl, state.sensitive, state.starred, state.toread, dataReload])

  const title = pageParams.get('query') ? ['🔖', pageParams.get('query') || '', '|', 'Bookmarks Search'] : []
  useTitle(...title)

  const onPageNav = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ ev) => {
    ev.preventDefault()
    if (pushState && window) {
      pushState(ev.currentTarget.href)
      window.scrollTo({ top: 0 })
    }
  }, [window, pushState])

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`./?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  let nextParams
  if (next) {
    nextParams = new URLSearchParams(query || '')
    nextParams.set('query', next.query)
    nextParams.set('rank', next.rank)
    nextParams.set('id', next.id)
    nextParams.set('reverse', next.reverse)
  }

  let prevParams
  if (prev) {
    prevParams = new URLSearchParams(query || '')
    prevParams.set('query', prev.query)
    prevParams.set('rank', prev.rank)
    prevParams.set('id', prev.id)
    prevParams.set('reverse', prev.reverse)
  }

  return html`
    <${Search}
      placeholder="Search Bookmarks..."
      value=${pageParams.get('query') || undefined}
      onSearch=${handleSearch}
    />

    <div>
      ${prev ? html`<a onClick=${onPageNav} href=${'./?' + prevParams}>prev</a>` : null}
      ${next ? html`<a onClick=${onPageNav} href=${'./?' + nextParams}>next</a>` : null}
      🔎
      🔖 <a href="${`../bookmarks?query=${pageParams.get('query') || ''}`}">bookmarks</a>
      🗄️ <a href="${`../archives?query=${pageParams.get('query') || ''}`}">archives</a>
      📼 <a href="${`../episodes?query=${pageParams.get('query') || ''}`}">episodes</a>
    </div>

    ${bookmarksLoading && !Array.isArray(bookmarks) ? html`<div>...</div>` : null}
    ${bookmarksError ? html`<div>${bookmarksError.message}</div>` : null}

    ${Array.isArray(bookmarks)
      ? bookmarks.map(b => html`
          ${tc(BookmarkList, {
            bookmark: b,
            reload,
            onDelete: reload
          }, b.id)}
        `)
      : null}

    <div>
      ${prev ? html`<a onClick=${onPageNav} href=${'./?' + prevParams}>prev</a>` : null}
      ${next ? html`<a onClick=${onPageNav} href=${'./?' + nextParams}>next</a>` : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
