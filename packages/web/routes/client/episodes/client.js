/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback } from 'preact/hooks'
import { tc } from '../lib/typed-component.js'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { EpisodeList } from '../components/episode/episode-list.js'
import { Search } from '../components/search/index.js'
import { PaginationButtons } from '../components/pagination-buttons/index.js'
import { useResolvePolling } from '../hooks/useResolvePolling.js'
import { useEpisodes } from '../hooks/useEpisodes.js'
import { QueryProvider } from '../lib/query-provider.js'
import { LoadingPlaceholder } from '../components/loading-placeholder/index.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const { user } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const {
    episodes,
    episodesLoading,
    episodesError,
    reloadEpisodes,
    beforeParams,
    afterParams,
  } = useEpisodes({ enabled: Boolean(user) })

  const onPageNav = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
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

  const handleSearch = useCallback((/** @type {string} */query) => {
    if (window) {
      window.location.replace(`/search/episodes/?query=${encodeURIComponent(query)}`)
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

  const hasEpisodes = Array.isArray(episodes) && episodes.length > 0
  const topEpisodeCreatedAt = hasEpisodes ? episodes[0]?.created_at : null
  const bottomEpisodeCreatedAt = hasEpisodes
    ? episodes[episodes.length - 1]?.created_at
    : null
  const topEpisodeDate = topEpisodeCreatedAt ? new Date(topEpisodeCreatedAt) : null
  const bottomEpisodeDate = bottomEpisodeCreatedAt ? new Date(bottomEpisodeCreatedAt) : null
  const topDateValue = formatDateValue(topEpisodeDate) || formatDateValue(cursorDate)
  const bottomDateValue = formatDateValue(bottomEpisodeDate) || formatDateValue(cursorDate)

  const hasPending = Array.isArray(episodes) && episodes.some(episode => (
    episode?.ready === false && !episode?.error
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reloadEpisodes,
  })

  const showEmptyState = Array.isArray(episodes) && episodes.length === 0 && !episodesLoading && !episodesError
  const showLoadingPlaceholder = episodesLoading && (!Array.isArray(episodes) || episodes.length === 0)
  const resultsClassName = (showEmptyState || showLoadingPlaceholder)
    ? 'bc-episodes-results bc-episodes-results-empty'
    : 'bc-episodes-results'
  const beforeParamsValue = beforeParams ? beforeParams.toString() : undefined
  const afterParamsValue = afterParams ? afterParams.toString() : undefined

  return html`
    <div class="bc-episodes-page">
      ${tc(Search, {
        placeholder: 'Search Episodes...',
        onSearch: handleSearch,
        autofocus: true,
      })}
      ${showEmptyState
? null
: html`
        <div class="bc-episodes-pagination bc-episodes-pagination-top">
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
          ? tc(LoadingPlaceholder, { label: 'Loading episodes' })
          : null}
        ${episodesError ? html`<div>${episodesError.message}</div>` : null}
        ${showEmptyState ? html`<div class="bc-episodes-empty">Bookmark some media!</div>` : null}
        ${Array.isArray(episodes)
          ? episodes.map(e => tc(EpisodeList, {
              episode: e,
              reload: reloadEpisodes,
              onDelete: reloadEpisodes,
              clickForPreview: true
            }, e.id))
          : null}
      </div>
      ${showEmptyState
? null
: html`
        <div class="bc-episodes-pagination bc-episodes-pagination-bottom">
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
