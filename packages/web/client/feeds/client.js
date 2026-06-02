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
import { useSearchParams } from '../hooks/useSearchParams.js'
import { useLSP } from '../hooks/useLSP.js'
import { EpisodeList } from '../components/episode/episode-list.js'
import { FeedHeader } from '../components/feed-header/feed-header.js'
import { Search } from '../components/search/index.js'
import { PaginationButtons } from '../components/pagination-buttons/index.js'
import { LoadingPlaceholder } from '../components/loading-placeholder/index.js'
import { mountPage } from '../lib/mount-page.js'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
import { useOfflineReadSync } from '../hooks/useOfflineReadSync.js'
import { useOfflineFeed } from '../hooks/useOfflineFeeds.js'
import { useOfflineEpisodes } from '../hooks/useOfflineEpisodes.js'
import { prepareOfflinePersistenceForCurrentUser } from '../lib/offline/offline-db.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { params: feedParams, setParams, pushState } = useSearchParams(['feed_id', 'before', 'after', 'offline_db_spike'])
  const queryClient = useQueryClient()
  const feedIdParam = feedParams['feed_id']
  const beforeParam = feedParams['before']
  const afterParam = feedParams['after']
  const online = useOnlineStatus()
  const showOfflineDbSpike = feedParams['offline_db_spike'] === 'true'
  const useOfflineData = showOfflineDbSpike && !online

  useOfflineReadSync({ enabled: showOfflineDbSpike })

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

  const {
    data: episodesData,
    isPending: networkEpisodesLoading,
    error: networkEpisodesError,
  } = useTanstackQuery({
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
    enabled: Boolean(user) && !useOfflineData,
    placeholderData: keepPreviousData,
  })

  const feedQueryKey = useMemo(() => ([
    'feed-details',
    state.apiUrl,
    feedId,
  ]), [feedId, state.apiUrl])

  const {
    data: feedData,
    isPending: networkFeedLoading,
    error: networkFeedError,
  } = useTanstackQuery({
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
    enabled: Boolean(user) && !useOfflineData,
  })

  const {
    feed: offlineFeed,
    feedLoading: offlineFeedLoading,
    feedError: offlineFeedError,
    reloadFeed: reloadOfflineFeed,
  } = useOfflineFeed(feedId, { enabled: showOfflineDbSpike })
  const offlineFeedId = feedId ?? offlineFeed?.id ?? ''
  const {
    episodes: offlineEpisodes,
    episodesLoading: offlineEpisodesLoading,
    episodesError: offlineEpisodesError,
    reloadEpisodes: reloadOfflineEpisodes,
  } = useOfflineEpisodes({
    enabled: showOfflineDbSpike,
    readyOnly: true,
    listFilters: false,
    feedId: offlineFeedId,
  })

  const reloadFeed = useCallback(async () => {
    if (useOfflineData) {
      await Promise.all([
        reloadOfflineFeed(),
        reloadOfflineEpisodes(),
      ])
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: feedQueryKey }),
      queryClient.invalidateQueries({ queryKey: episodesQueryKey }),
    ])
  }, [episodesQueryKey, feedQueryKey, queryClient, reloadOfflineEpisodes, reloadOfflineFeed, useOfflineData])

  const episodesBody = /** @type {{ data?: TypeEpisodeReadClient[], pagination?: { before?: string, after?: string, top?: boolean } } | undefined} */ (episodesData)
  const networkEpisodes = episodesBody?.data
  const networkFeed = /** @type {TypeFeedRead | undefined} */ (feedData)
  const episodes = useOfflineData ? offlineEpisodes : networkEpisodes
  const feed = useOfflineData ? offlineFeed : networkFeed
  const episodesLoading = useOfflineData ? (offlineFeedLoading || offlineEpisodesLoading) : networkEpisodesLoading
  const episodesError = useOfflineData ? (offlineFeedError || offlineEpisodesError) : networkEpisodesError
  const feedLoading = useOfflineData ? offlineFeedLoading : networkFeedLoading
  const feedError = useOfflineData ? offlineFeedError : networkFeedError
  const before = useOfflineData || !episodesBody?.pagination?.before ? undefined : new Date(episodesBody.pagination.before)
  const after = useOfflineData || !episodesBody?.pagination?.after ? undefined : new Date(episodesBody.pagination.after)

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

  const showEmptyState = !useOfflineData && Array.isArray(episodes) && episodes.length === 0 && !episodesLoading && !episodesError
  const showOfflineEmptyState = useOfflineData && Array.isArray(episodes) && episodes.length === 0 && !episodesLoading && !episodesError
  const showLoadingPlaceholder = episodesLoading && (!Array.isArray(episodes) || episodes.length === 0)
  const resultsClassName = (showEmptyState || showOfflineEmptyState || showLoadingPlaceholder)
    ? 'bc-feeds-results bc-feeds-results-empty'
    : 'bc-feeds-results'
  const showOfflineMissingFeed = useOfflineData && !feedLoading && !feedError && !feed

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
        ${showOfflineMissingFeed ? html`<div>No synced feed available.</div>` : null}
      </div>
      ${showEmptyState || showOfflineEmptyState
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
        ${showOfflineEmptyState ? html`<div class="bc-feeds-empty">No synced feed episodes available.</div>` : null}
        ${Array.isArray(episodes)
          ? episodes.map(e => tc(EpisodeList, {
              episode: e,
              onInvalidate: reloadFeed,
              clickForPreview: true
            }, e.id))
          : null}
      </div>
      ${showEmptyState || showOfflineEmptyState
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

mountPage(Page, { beforeMount: prepareOfflinePersistenceForCurrentUser })
