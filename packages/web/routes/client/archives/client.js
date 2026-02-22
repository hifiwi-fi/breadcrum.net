/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { ArchiveList } from '../components/archive/archive-list.js'
import { Search } from '../components/search/index.js'
import { PaginationButtons } from '../components/pagination-buttons/index.js'
import { useResolvePolling } from '../hooks/useResolvePolling.js'
import { useArchives } from '../hooks/useArchives.js'
import { QueryProvider } from '../lib/query-provider.js'
import { tc } from '../lib/typed-component.js'
import { LoadingPlaceholder } from '../components/loading-placeholder/index.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const { user } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const {
    archives,
    archivesLoading,
    archivesError,
    reloadArchives,
    beforeParams,
    afterParams,
  } = useArchives({ enabled: Boolean(user) })

  const onPageNav = useCallback((/** @type {Event} */ ev) => {
    ev.preventDefault()
    const target = /** @type {HTMLAnchorElement | null} */ (ev.currentTarget)
    if (pushState && window && target?.href) {
      pushState(target.href)
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
      window.location.replace(`/search/archives/?query=${encodeURIComponent(query)}`)
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

  const hasArchives = Array.isArray(archives) && archives.length > 0
  const topArchiveCreatedAt = hasArchives ? archives[0]?.created_at : null
  const bottomArchiveCreatedAt = hasArchives
    ? archives[archives.length - 1]?.created_at
    : null
  const topArchiveDate = topArchiveCreatedAt ? new Date(topArchiveCreatedAt) : null
  const bottomArchiveDate = bottomArchiveCreatedAt ? new Date(bottomArchiveCreatedAt) : null
  const topDateValue = formatDateValue(topArchiveDate) || formatDateValue(cursorDate)
  const bottomDateValue = formatDateValue(bottomArchiveDate) || formatDateValue(cursorDate)

  const hasPending = Array.isArray(archives) && archives.some(archive => (
    archive?.ready === false && !archive?.error
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reloadArchives,
  })

  const showEmptyState = Array.isArray(archives) && archives.length === 0 && !archivesLoading && !archivesError
  const showLoadingPlaceholder = archivesLoading && (!Array.isArray(archives) || archives.length === 0)
  const resultsClassName = (showEmptyState || showLoadingPlaceholder)
    ? 'bc-archives-results bc-archives-results-empty'
    : 'bc-archives-results'
  const beforeParamsValue = beforeParams ? beforeParams.toString() : undefined
  const afterParamsValue = afterParams ? afterParams.toString() : undefined

  return html`
    <div class="bc-archives-page">
      ${tc(Search, {
        placeholder: 'Search Archives...',
        onSearch: handleSearch,
        autofocus: true,
      })}
      ${showEmptyState
? null
: html`
        <div class="bc-archives-pagination bc-archives-pagination-top">
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
          ? tc(LoadingPlaceholder, { label: 'Loading archives' })
          : null}
        ${archivesError ? html`<div>${archivesError.message}</div>` : null}
        ${showEmptyState ? html`<div class="bc-archives-empty">Bookmark some articles!</div>` : null}
        ${Array.isArray(archives)
          ? archives.map(ar => html`
              <${ArchiveList}
                key=${ar.id}
                archive=${ar}
                reload=${reloadArchives}
                onDelete=${reloadArchives}
                clickForPreview=${true}
              />
            `)
          : null}
      </div>
      ${showEmptyState
? null
: html`
        <div class="bc-archives-pagination bc-archives-pagination-bottom">
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
