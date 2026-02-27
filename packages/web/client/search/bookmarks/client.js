/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { html } from 'htm/preact'
import { useCallback, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { tc } from '../../lib/typed-component.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useUser } from '../../hooks/useUser.js'
import { useQuery, useSearchParams } from '../../hooks/useQuery.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { BookmarkList } from '../../components/bookmark/bookmark-list.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'
import { mountPage } from '../../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { pushState } = useQuery()
  const { params: searchParams, setParams } = useSearchParams(['query', 'id', 'rank', 'reverse', 'per_page'])
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
    'search-bookmarks',
    state.apiUrl,
    queryParams.toString(),
  ]), [queryParams, state.apiUrl])

  const { data, isPending: bookmarksLoading, error: bookmarksError } = useTanstackQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/search/bookmarks?${queryParams.toString()}`, {
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

  const body = /** @type {{ data?: TypeBookmarkReadClient[], pagination?: { next?: any, prev?: any } } | undefined} */ (data)
  const bookmarks = body?.data
  const next = body?.pagination?.next
  const prev = body?.pagination?.prev

  const reload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const title = queryValue ? ['🔖', queryValue, '|', 'Bookmarks Search'] : []
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

  const hasPending = Array.isArray(bookmarks) && bookmarks.some(bookmark => (
    bookmark?.done === false ||
    (bookmark.archives?.some(archive => archive?.ready === false && !archive?.error)) ||
    (bookmark.episodes?.some(episode => episode?.ready === false && !episode?.error))
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

  const showEmptyState = Array.isArray(bookmarks) && bookmarks.length === 0 && !bookmarksLoading && !bookmarksError
  const resultsClassName = showEmptyState
    ? 'bc-search-results bc-search-results-empty'
    : 'bc-search-results'

  return html`
    <div class="bc-search-page">
      ${tc(Search, {
        placeholder: 'Search Bookmarks...',
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
        ${bookmarksLoading && !Array.isArray(bookmarks) ? html`<div>...</div>` : null}
        ${bookmarksError ? html`<div>${/** @type {Error} */(bookmarksError).message}</div>` : null}
        ${showEmptyState
          ? html`
            <div class="bc-search-empty">
              ${queryValue ? 'No bookmarks found.' : 'Search for bookmarks.'}
            </div>
          `
          : null}

        ${Array.isArray(bookmarks)
          ? bookmarks.map(b => html`
              ${tc(BookmarkList, {
                bookmark: b,
                reload,
                onDelete: reload
              }, b.id)}
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
