/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback } from 'preact/hooks'
import { tc } from '../lib/typed-component.js'
import { useUser } from '../hooks/useUser.js'
import { useQuery } from '../hooks/useQuery.js'
import { useWindow } from '../hooks/useWindow.js'
import { BookmarkList } from '../components/bookmark/bookmark-list.js'
import { Search } from '../components/search/index.js'
import { useBookmarks } from '../hooks/useBookmarks.js'
import { PaginationButtons } from '../components/pagination-buttons/index.js'
import { useResolvePolling } from '../hooks/useResolvePolling.js'
import { BookmarkQuickAdd } from '../components/bookmark/bookmark-quick-add.js'

/** @type {FunctionComponent} */
export const Page = () => {
  useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const {
    bookmarksLoading,
    bookmarksError,
    bookmarks,
    reloadBookmarks,
    beforeParams,
    afterParams
  } = useBookmarks()

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

  const handleQuickAdd = useCallback((/** @type {string} */ url) => {
    if (window) {
      window.location.replace(`/bookmarks/add?url=${encodeURIComponent(url)}`)
    }
  }, [window])

  const tagFilterRemovedParams = new URLSearchParams(query || '')
  const tagFilter = tagFilterRemovedParams.get('tag')
  tagFilterRemovedParams.delete('tag')

  const hasPending = Array.isArray(bookmarks) && bookmarks.some(bookmark => (
    bookmark?.done === false ||
    (bookmark.archives?.some(archive => archive?.ready === false && !archive?.error)) ||
    (bookmark.episodes?.some(episode => episode?.ready === false && !episode?.error))
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reloadBookmarks,
  })

  return html`
    <${Search}
      placeholder="Search Bookmarks..."
      onSearch=${handleSearch}
      autofocus=${true}
    />
    <div class="bc-bookmarks-actions">
      ${tc(BookmarkQuickAdd, { onSubmitUrl: handleQuickAdd })}
      ${tagFilter ? html`<span class='bc-tag-filter-remove'>🏷${tagFilter}<a onClick=${onPageNav} href=${`./?${tagFilterRemovedParams}`}><sub>⊖</sub></a></span>` : null}
    </div>
    <${PaginationButtons} onPageNav=${onPageNav} beforeParams=${beforeParams} afterParams=${afterParams} />
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

      <${PaginationButtons} onPageNav=${onPageNav} beforeParams=${beforeParams} afterParams=${afterParams} />
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
