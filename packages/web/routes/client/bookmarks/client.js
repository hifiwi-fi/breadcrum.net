/// <reference lib="dom" />

/** @import { FunctionComponent, ComponentChild } from 'preact' */
/** @import { TypeBookmarkReadClient } from '../../api/bookmarks/schemas/schema-bookmark-read.js' */

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
import { QueryProvider } from '../lib/query-provider.js'
import { LoadingPlaceholder } from '../components/loading-placeholder/index.js'

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

  const onDateNav = useCallback((/** @type {string} */ url) => {
    if (pushState && window) {
      const resolvedUrl = new URL(url, window.location.href).toString()
      pushState(resolvedUrl)
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

  const dateParams = new URLSearchParams(query || '')
  const formatDateValue = (/** @type {Date | null} */ date) => {
    if (!date || Number.isNaN(date.valueOf())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const cursorDate = (() => {
    const beforeCursor = dateParams.get('before')
    const afterCursor = dateParams.get('after')
    const cursor = beforeCursor ?? afterCursor
    if (!cursor) return null
    const cursorValue = Number(cursor)
    if (Number.isNaN(cursorValue)) return null
    const adjusted = beforeCursor ? cursorValue - 1 : cursorValue
    const date = new Date(adjusted)
    return Number.isNaN(date.valueOf()) ? null : date
  })()

  const hasBookmarks = Array.isArray(bookmarks) && bookmarks.length > 0
  const topBookmarkCreatedAt = hasBookmarks ? bookmarks[0]?.created_at : null
  const bottomBookmarkCreatedAt = hasBookmarks
    ? bookmarks[bookmarks.length - 1]?.created_at
    : null
  const topBookmarkDate = topBookmarkCreatedAt ? new Date(topBookmarkCreatedAt) : null
  const bottomBookmarkDate = bottomBookmarkCreatedAt ? new Date(bottomBookmarkCreatedAt) : null
  const topDateValue = formatDateValue(topBookmarkDate) || formatDateValue(cursorDate)
  const bottomDateValue = formatDateValue(bottomBookmarkDate) || formatDateValue(cursorDate)

  const tagFilterRemovedParams = new URLSearchParams(query || '')
  const tagFilter = tagFilterRemovedParams.get('tag')
  tagFilterRemovedParams.delete('tag')

  /** @typedef {TypeBookmarkReadClient['archives'][number] | null | undefined} BookmarkArchive */
  /** @typedef {TypeBookmarkReadClient['episodes'][number] | null | undefined} BookmarkEpisode */

  const hasPending = Array.isArray(bookmarks) && bookmarks.some(bookmark => (
    bookmark?.done === false ||
    (bookmark.archives?.some(/** @param {BookmarkArchive} archive */(archive) => archive?.ready === false && !archive?.error)) ||
    (bookmark.episodes?.some(/** @param {BookmarkEpisode} episode */(episode) => episode?.ready === false && !episode?.error))
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reloadBookmarks,
  })

  const bookmarkRows = Array.isArray(bookmarks)
    ? (() => {
        const weekdayNames = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        ]

        /** @type {ComponentChild[]} */
        const rows = []
        let lastDateValue = ''

        for (let index = 0; index < bookmarks.length; index += 1) {
          const bookmark = bookmarks[index]
          if (!bookmark) continue

          const createdAt = bookmark.created_at
          const dateValue = createdAt ? formatDateValue(new Date(createdAt)) : ''
          const isDayChange = Boolean(dateValue && lastDateValue && dateValue !== lastDateValue)

          if (isDayChange && createdAt) {
            const date = new Date(createdAt)
            const weekdayName = weekdayNames[date.getDay()]
            rows.push(html`
              <div class="bc-bookmark-date-separator" key=${`sep-${dateValue}-${bookmark.id}`}>
                <span>${`${dateValue} ${weekdayName}`}</span>
              </div>
            `)
          }

          const nextBookmark = bookmarks[index + 1]
          const nextCreatedAt = nextBookmark?.created_at
          const nextDateValue = nextCreatedAt ? formatDateValue(new Date(nextCreatedAt)) : ''
          const isGroupEnd = Boolean(dateValue && nextDateValue && dateValue !== nextDateValue)

          const bookmarkNode = tc(BookmarkList, {
            bookmark,
            reload: reloadBookmarks,
            onDelete: reloadBookmarks
          }, bookmark.id)

          if (isGroupEnd) {
            rows.push(html`
              <div class="bc-bookmark-group-end" key=${`group-end-${bookmark.id}`}>
                ${bookmarkNode}
              </div>
            `)
          } else {
            rows.push(bookmarkNode)
          }

          if (dateValue) {
            lastDateValue = dateValue
          }
        }

        return rows
      })()
    : null
  const showEmptyState = Array.isArray(bookmarks) && bookmarks.length === 0 && !bookmarksLoading && !bookmarksError
  const showLoadingPlaceholder = bookmarksLoading && (!Array.isArray(bookmarks) || bookmarks.length === 0)
  const beforeParamsValue = beforeParams ? beforeParams.toString() : undefined
  const afterParamsValue = afterParams ? afterParams.toString() : undefined
  const resultsClassName = (showEmptyState || showLoadingPlaceholder)
    ? 'bc-bookmarks-results bc-bookmarks-results-empty'
    : 'bc-bookmarks-results'

  return html`
    <div class="bc-bookmarks-page">
      ${tc(Search, {
        placeholder: 'Search Bookmarks...',
        onSearch: handleSearch,
        autofocus: true,
      })}
      <div class="bc-bookmarks-actions">
        ${showEmptyState
          ? null
          : tc(BookmarkQuickAdd, { onSubmitUrl: handleQuickAdd })}
        ${tagFilter ? html`<span class='bc-tag-filter-remove'>🏷${tagFilter}<a onClick=${onPageNav} href=${`./?${tagFilterRemovedParams}`}><sub>⊖</sub></a></span>` : null}
      </div>
      ${showEmptyState
? null
: html`
        <div class="bc-bookmarks-pagination bc-bookmarks-pagination-top">
          ${tc(PaginationButtons, {
            onPageNav,
            onDateNav,
            dateParams,
            dateValue: topDateValue,
            beforeParams: beforeParamsValue,
            afterParams: afterParamsValue,
          })}
        </div>
      `}
      <div class=${resultsClassName}>
        ${showLoadingPlaceholder
          ? tc(LoadingPlaceholder, { label: 'Loading bookmarks' })
          : null}
        ${bookmarksError ? html`<div>${bookmarksError.message}</div>` : null}
        ${showEmptyState
          ? html`
            <div class="bc-bookmarks-empty-state">
              <div class="bc-bookmarks-empty">Add your first bookmark!</div>
              <div class="bc-bookmarks-empty-quickadd">
                ${tc(BookmarkQuickAdd, {
                  onSubmitUrl: handleQuickAdd,
                  showToggle: false,
                  showCancel: false,
                })}
              </div>
            </div>
          `
          : null}
        ${bookmarkRows}
      </div>
      ${showEmptyState
? null
: html`
        <div class="bc-bookmarks-pagination bc-bookmarks-pagination-bottom">
          ${tc(PaginationButtons, {
            onPageNav,
            onDateNav,
            dateParams,
            dateValue: bottomDateValue,
            beforeParams: beforeParamsValue,
            afterParams: afterParamsValue,
          })}
        </div>
      `}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${QueryProvider}><${Page} /><//>`, container)
  }
}
