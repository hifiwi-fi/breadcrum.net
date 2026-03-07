/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js' */

import { html } from 'htm/preact'
import { useCallback, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { tc } from '../../lib/typed-component.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useUser } from '../../hooks/useUser.js'
import { useSearchParams } from '../../hooks/useSearchParms.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { EpisodeList } from '../../components/episode/episode-list.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'
import { mountPage } from '../../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { params: searchParams, setParams, pushState } = useSearchParams(['query', 'id', 'rank', 'reverse', 'per_page'])
  const queryClient = useQueryClient()
  const queryParam = searchParams['query']
  const idParam = searchParams['id']
  const rankParam = searchParams['rank']
  const reverseParam = searchParams['reverse']
  const perPageParam = searchParams['per_page']

  const queryValue = queryParam ?? ''

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (perPageParam) params.set('per_page', perPageParam)
    params.set('query', queryParam ?? '')
    if (idParam) params.set('id', idParam)
    if (rankParam) params.set('rank', rankParam)
    if (reverseParam) params.set('reverse', reverseParam)
    params.set('sensitive', state.sensitive.toString())
    params.set('toread', state.toread.toString())
    params.set('starred', state.starred.toString())
    return params
  }, [idParam, perPageParam, queryParam, rankParam, reverseParam, state.sensitive, state.toread, state.starred])

  const queryKey = useMemo(() => ([
    'search-episodes',
    state.apiUrl,
    queryParams.toString(),
  ]), [queryParams, state.apiUrl])

  const { data, isPending: episodesLoading, error: episodesError } = useTanstackQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/search/episodes?${queryParams.toString()}`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }

      const body = await response.json()

      if (body?.pagination?.top) {
        setParams({ id: null, rank: null, reverse: null })
      }

      return body
    },
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
  })

  const body = /** @type {{ data?: TypeEpisodeReadClient[], pagination?: { next?: any, prev?: any } } | undefined} */ (data)
  const episodes = body?.data
  const next = body?.pagination?.next
  const prev = body?.pagination?.prev

  const reload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const title = queryValue ? ['📼', queryValue, '|', 'Episodes Search'] : []
  useTitle(...title)

  const onPageNav = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ ev) => {
    ev.preventDefault()
    if (pushState && window) {
      pushState(ev.currentTarget.href)
      window.scrollTo({ top: 0 })
    }
  }, [window, pushState])

  const handleSearch = useCallback((/** @type {string} */ q) => {
    setParams(
      {
        query: q || null,
        id: null,
        rank: null,
        reverse: null,
      },
      { replace: false }
    )
    window?.scrollTo({ top: 0 })
  }, [setParams, window])

  const hasPending = Array.isArray(episodes) && episodes.some(episode => (
    episode?.ready === false && !episode?.error
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reload,
  })

  let nextParams
  if (next) {
    nextParams = new URLSearchParams()
    if (perPageParam) nextParams.set('per_page', perPageParam)
    nextParams.set('query', next.query)
    nextParams.set('rank', next.rank)
    nextParams.set('id', next.id)
    nextParams.set('reverse', next.reverse)
  }

  let prevParams
  if (prev) {
    prevParams = new URLSearchParams()
    if (perPageParam) prevParams.set('per_page', perPageParam)
    prevParams.set('query', prev.query)
    prevParams.set('rank', prev.rank)
    prevParams.set('id', prev.id)
    prevParams.set('reverse', prev.reverse)
  }

  const showEmptyState = Array.isArray(episodes) && episodes.length === 0 && !episodesLoading && !episodesError
  const resultsClassName = showEmptyState
    ? 'bc-search-results bc-search-results-empty'
    : 'bc-search-results'

  return html`
    <div class="bc-search-page">
      ${tc(Search, {
        placeholder: 'Search Episodes...',
        value: queryValue || '',
        onSearch: handleSearch,
        autofocus: true,
      })}

      <div>
        ${prev ? html`<a onClick=${onPageNav} href=${'./?' + prevParams}>prev</a>` : null}
        ${'\n'}
        ${next ? html`<a onClick=${onPageNav} href=${'./?' + nextParams}>next</a>` : null}
        ${'\n'}
        🔎
        ${'\n'}
        🔖 <a href="${`../bookmarks?query=${queryValue}`}">bookmarks</a>
        ${'\n'}
        🗄️ <a href="${`../archives?query=${queryValue}`}">archives</a>
        ${'\n'}
        📼 <a href="${`../episodes?query=${queryValue}`}">episodes</a>
      </div>

      <div class=${resultsClassName}>
        ${episodesLoading && !Array.isArray(episodes) ? html`<div>...</div>` : null}
        ${episodesError ? html`<div>${/** @type {Error} */(episodesError).message}</div>` : null}
        ${showEmptyState
          ? html`
            <div class="bc-search-empty">
              ${queryValue ? 'No episodes found.' : 'Search for episodes.'}
            </div>
          `
          : null}

        ${Array.isArray(episodes)
          ? episodes.map(e => html`
              ${tc(EpisodeList, {
                episode: e,
                onInvalidate: reload,
              }, e.id)}
            `)
          : null}
      </div>

      <div>
        ${prev ? html`<a onClick=${onPageNav} href=${'./?' + prevParams}>prev</a>` : null}
        ${next ? html`<a onClick=${onPageNav} href=${'./?' + nextParams}>next</a>` : null}
      </div>
    </div>
  `
}

mountPage(Page)
