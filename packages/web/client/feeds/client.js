/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js' */
/** @import { TypeFeedRead } from '../../routes/api/feeds/schemas/schema-feed-read.js' */

import { html } from 'htm/preact'
import { useMemo, useCallback } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { tc } from '../lib/typed-component.js'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery, useSearchParams } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { EpisodeList } from '../components/episode/episode-list.js'
import { FeedHeader } from '../components/feed-header/feed-header.js'
import { Search } from '../components/search/index.js'
import { PaginationButtons } from '../components/pagination-buttons/index.js'
import { LoadingPlaceholder } from '../components/loading-placeholder/index.js'
import { mountPage } from '../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { pushState } = useQuery()
  const { params: feedParams, setParams } = useSearchParams(['feed_id', 'before', 'after'])
  const queryClient = useQueryClient()
  const feedIdParam = feedParams['feed_id']
  const beforeParam = feedParams['before']
  const afterParam = feedParams['after']

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (feedIdParam) params.set('feed_id', feedIdParam)
    if (beforeParam) params.set('before', beforeParam)
    if (afterParam) params.set('after', afterParam)
    return params.toString()
  }, [afterParam, beforeParam, feedIdParam])
  const feedId = feedIdParam

  const episodesQueryKey = useMemo(() => ([
    'feed-episodes',
    state.apiUrl,
    state.sensitive,
    queryString,
  ]), [queryString, state.apiUrl, state.sensitive])

  const { data: episodesData, isPending: episodesLoading, error: episodesError } = useTanstackQuery({
    queryKey: episodesQueryKey,
    queryFn: async ({ signal }) => {
      const requestParams = new URLSearchParams(queryString)

      // Transform date string to date object
      const beforeParam = requestParams.get('before')
      const afterParam = requestParams.get('after')
      if (beforeParam) requestParams.set('before', (new Date(+beforeParam)).toISOString())
      if (afterParam) requestParams.set('after', (new Date(+afterParam)).toISOString())

      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('ready', 'true')

      if (!requestParams.get('feed_id')) {
        requestParams.set('default_feed', 'true')
      }

      const response = await fetch(`${state.apiUrl}/episodes?${requestParams.toString()}`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()

        if (body?.pagination?.top) {
          setParams({ before: null, after: null })
        }

        return body
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
  })

  const feedQueryKey = useMemo(() => ([
    'feed-details',
    state.apiUrl,
    feedId,
  ]), [feedId, state.apiUrl])

  const { data: feedData, isPending: feedLoading, error: feedError } = useTanstackQuery({
    queryKey: feedQueryKey,
    queryFn: async ({ signal }) => {
      const requestURL = feedId
        ? `/feeds/${feedId}/details/`
        : '/feeds/default-feed/details'

      const response = await fetch(`${state.apiUrl}${requestURL}`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        return body?.data
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    enabled: Boolean(user),
  })

  const reloadFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: feedQueryKey })
  }, [feedQueryKey, queryClient])

  const episodesBody = /** @type {{ data?: TypeEpisodeReadClient[], pagination?: { before?: string, after?: string, top?: boolean } } | undefined} */ (episodesData)
  const episodes = episodesBody?.data
  const feed = /** @type {TypeFeedRead | undefined} */ (feedData)
  const before = episodesBody?.pagination?.before ? new Date(episodesBody.pagination.before) : undefined
  const after = episodesBody?.pagination?.after ? new Date(episodesBody.pagination.after) : undefined

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

  const handleSearch = useCallback((/** @type {string} */q) => {
    if (window) {
      window.location.replace(`/search/episodes/?query=${encodeURIComponent(q)}`)
    }
  }, [window])

  const dateParams = new URLSearchParams(queryString)
  const formatDateValue = (/** @type {Date | null | undefined} */ date) => {
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
  const bottomEpisodeCreatedAt = hasEpisodes ? episodes[episodes.length - 1]?.created_at : null
  const topEpisodeDate = topEpisodeCreatedAt ? new Date(topEpisodeCreatedAt) : null
  const bottomEpisodeDate = bottomEpisodeCreatedAt ? new Date(bottomEpisodeCreatedAt) : null
  const topDateValue = formatDateValue(topEpisodeDate) || formatDateValue(cursorDate)
  const bottomDateValue = formatDateValue(bottomEpisodeDate) || formatDateValue(cursorDate)

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(queryString)
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(queryString)
    afterParams.set('after', after.valueOf().toString())
    afterParams.delete('before')
  }
  const beforeParamsValue = beforeParams ? beforeParams.toString() : undefined
  const afterParamsValue = afterParams ? afterParams.toString() : undefined

  const showEmptyState = Array.isArray(episodes) && episodes.length === 0 && !episodesLoading && !episodesError
  const showLoadingPlaceholder = episodesLoading && (!Array.isArray(episodes) || episodes.length === 0)
  const resultsClassName = (showEmptyState || showLoadingPlaceholder)
    ? 'bc-feeds-results bc-feeds-results-empty'
    : 'bc-feeds-results'

  return html`
    <div class="bc-feeds-page">
      ${tc(Search, {
        placeholder: 'Search Feed...',
        onSearch: handleSearch,
        autofocus: true,
      })}
      <div>
        ${feed ? tc(FeedHeader, { feed, reload: reloadFeed }) : null}
        ${feedLoading ? html`<div>Loading feed...</div>` : null}
        ${feedError ? html`<div>${/** @type {Error} */(feedError).message}</div>` : null}
      </div>
      ${showEmptyState
? null
: html`
        <div class="bc-feeds-pagination bc-feeds-pagination-top">
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
        ${episodesError ? html`<div>${/** @type {Error} */(episodesError).message}</div>` : null}
        ${showEmptyState ? html`<div class="bc-feeds-empty">Bookmark some media!</div>` : null}
        ${Array.isArray(episodes)
          ? episodes.map(e => tc(EpisodeList, {
              episode: e,
              onInvalidate: reloadFeed,
              clickForPreview: true
            }, e.id))
          : null}
      </div>
      ${showEmptyState
? null
: html`
        <div class="bc-feeds-pagination bc-feeds-pagination-bottom">
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

mountPage(Page)
