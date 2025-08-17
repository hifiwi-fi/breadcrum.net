/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useCallback } from 'preact/hooks'
import { tc } from '../lib/typed-component.js'
import { useUser } from '../hooks/useUser.js'
import { useQuery } from '../hooks/useQuery.js'
import { useWindow } from '../hooks/useWindow.js'
import { BookmarkList } from '../components/bookmark/bookmark-list.js'
import { Search } from '../components/search/index.js'
import { useBookmarks } from '../hooks/useBookmarks.js'

/** @type {FunctionComponent} */
export const Page = () => {
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
    if (pushState && window) {
      pushState(ev.currentTarget.href)
      window.scrollTo({ top: 0 })
    }
  }, [window, pushState])

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`/search/bookmarks/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  const tagFilterRemovedParams = new URLSearchParams(query || '')
  const tagFilter = tagFilterRemovedParams.get('tag')
  tagFilterRemovedParams.delete('tag')

  return html`
    <${Search}
      placeholder="Search Bookmarks..."
      onSearch=${handleSearch}
    />
    <div>
      ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
    </div>

    <div>
      <span>🔖 <a href="./add">add +</a></span>
      ${tagFilter ? html`<span class='bc-tag-filter-remove'>🏷${tagFilter}<a onClick=${onPageNav} href=${`./?${tagFilterRemovedParams}`}><sub>⊖</sub></a></span>` : null}
    </div>
    ${bookmarksLoading && !Array.isArray(bookmarks) ? html`<div>...</div>` : null}
    ${bookmarksError ? html`<div>${bookmarksError.message}</div>` : null}
    ${Array.isArray(bookmarks)
      ? bookmarks.map(b => html`
          ${tc(BookmarkList, {
            bookmark: b,
            reload: reloadBookmarks,
            onDelete: reloadBookmarks
          }, b.id)}
        `)
      : null}

    <div>
      ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
