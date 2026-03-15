/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js' */

import { html } from 'htm/preact'
import { useCallback, useEffect, useMemo } from 'preact/hooks'
import { keepPreviousData, useQuery as useTanstackQuery, useQueryClient } from '@tanstack/preact-query'
import { tc } from '../../lib/typed-component.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useUser } from '../../hooks/useUser.js'
import { useSearchParams } from '../../hooks/useSearchParams.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { ArchiveList } from '../../components/archive/archive-list.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'
import { mountPage } from '../../lib/mount-page.js'
import { withinResolvingWindow } from '../../hooks/resolve-timeout.js'

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
    'search-archives',
    state.apiUrl,
    queryParams.toString(),
  ]), [queryParams, state.apiUrl])

  const { data, isPending: archivesLoading, error: archivesError } = useTanstackQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/search/archives?${queryParams.toString()}`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }

      const body = await response.json()

      return body
    },
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
  })

  // Cursor cleanup: when the server signals we're at the first page, remove stale
  // id/rank/reverse params from the URL. Runs in an effect (not queryFn) to keep
  // queryFn pure. setParams is idempotent — no-op if params already absent.
  useEffect(() => {
    if (data?.pagination?.top) {
      setParams({ id: null, rank: null, reverse: null })
    }
  }, [data, setParams])

  const body = /** @type {{ data?: TypeArchiveReadClient[], pagination?: { next?: any, prev?: any } } | undefined} */ (data)
  const archives = body?.data
  const next = body?.pagination?.next
  const prev = body?.pagination?.prev

  const reload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const title = queryValue ? ['🗄️', queryValue, '|', 'Archives Search'] : []
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

  const hasPending = Array.isArray(archives) && archives.some(archive => (
    archive?.ready === false && !archive?.error && withinResolvingWindow(archive?.created_at)
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

  const showEmptyState = Array.isArray(archives) && archives.length === 0 && !archivesLoading && !archivesError
  const resultsClassName = showEmptyState
    ? 'bc-search-results bc-search-results-empty'
    : 'bc-search-results'

  return html`
    <div class="bc-search-page">
      ${tc(Search, {
        placeholder: 'Search Archives...',
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
        ${archivesLoading && !Array.isArray(archives) ? html`<div>...</div>` : null}
        ${archivesError ? html`<div>${/** @type {Error} */(archivesError).message}</div>` : null}
        ${showEmptyState
          ? html`
            <div class="bc-search-empty">
              ${queryValue ? 'No archives found.' : 'Search for archives.'}
            </div>
          `
          : null}

        ${Array.isArray(archives)
          ? archives.map(a => html`
              ${tc(ArchiveList, {
                archive: a,
                onInvalidate: reload,
              }, a.id)}
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
