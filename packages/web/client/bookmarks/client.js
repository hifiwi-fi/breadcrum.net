/// <reference lib="dom" />

// @ts-expect-error
import { Component, html, render, useEffect, useCallback } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useQuery } from '../hooks/useQuery.js'
import { useWindow } from '../hooks/useWindow.js'
import { bookmarkList } from '../components/bookmark/bookmark-list.js'
import { search } from '../components/search/index.js'
import { useBookmarks } from '../hooks/useBookmarks.js'

export const page = Component(() => {
  const { user, loading } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const {
    bookmarksLoading,
    bookmarksError,
    bookmarks,
    reloadBookmarks,
    before,
    after,
    beforeParams,
    afterParams
  } = useBookmarks()

  // Require a user
  useEffect(() => {
    if (!user && !loading && window) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  const onPageNav = useCallback((/** @type{MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    window?.scrollTo({ top: 0 })
  }, [window, pushState])

  const handleSearch = useCallback((query) => {
    window?.location.replace(`/search/bookmarks/?query=${encodeURIComponent(query)}`)
  }, [window])

  const tagFilterRemovedParams = new URLSearchParams(query)
  const tagFilter = tagFilterRemovedParams.get('tag')
  tagFilterRemovedParams.delete('tag')

  return html`
    ${search({
      placeholder: 'Search Bookmarks...',
      onSearch: handleSearch,
    })}
    <div>
      ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
    </div>

    <div>
      <span>🔖 <a href="./add">add +</a></span>
      ${tagFilter ? html`<span class='bc-tag-filter-remove'>🏷${tagFilter}<a onclick=${onPageNav} href=${`./?${tagFilterRemovedParams}`}><sub>⊖</sub></a></span>` : null}
    </div>
    ${bookmarksLoading && !Array.isArray(bookmarks) ? html`<div>...</div>` : null}
    ${bookmarksError ? html`<div>${bookmarksError.message}</div>` : null}
    ${Array.isArray(bookmarks)
      ? bookmarks.map(b => html.for(b, b.id)`${bookmarkList({ bookmark: b, reload: reloadBookmarks, onDelete: reloadBookmarks })}`)
      : null}

  <div>
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
  </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
