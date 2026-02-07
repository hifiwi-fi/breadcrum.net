/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useCallback, useState } from 'preact/hooks'
import { tc } from '../../lib/typed-component.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useUser } from '../../hooks/useUser.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { EpisodeList } from '../../components/episode/episode-list.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [episodes, setEpisodes] = useState(/** @type {TypeEpisodeReadClient[] | undefined} */(undefined))
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError] = useState(/** @type {Error | null} */(null))

  const [next, setNext] = useState(/** @type {any} */(undefined))
  const [prev, setPrev] = useState(/** @type {any} */(undefined))

  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  const pageParams = new URLSearchParams(query || '')
  const queryValue = pageParams.get('query') ?? ''

  // Search episodes
  useEffect(() => {
    async function getEpisodes () {
      console.log('loading episode results')
      setEpisodesLoading(true)
      setEpisodesError(null)

      const queryParams = new URLSearchParams()

      if (pageParams.get('per_page')) queryParams.set('per_page', pageParams.get('per_page') ?? '')
      queryParams.set('query', pageParams.get('query') ?? '')
      if (pageParams.get('id')) queryParams.set('id', pageParams.get('id') ?? '')
      if (pageParams.get('rank')) queryParams.set('rank', pageParams.get('rank') ?? '')
      if (pageParams.get('reverse')) queryParams.set('reverse', pageParams.get('reverse') ?? '')
      queryParams.set('sensitive', state.sensitive.toString())
      queryParams.set('toread', state.toread.toString())
      queryParams.set('starred', state.starred.toString())

      const response = await fetch(`${state.apiUrl}/search/episodes?${queryParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setEpisodes(body?.data)
        setNext(body?.pagination?.next)
        setPrev(body?.pagination?.prev)

        if (body?.pagination?.top && window) {
          const newParams = new URLSearchParams(query || '')
          let modified = false
          if (newParams.get('id')) {
            newParams.delete('id')
            modified = true
          }
          if (newParams.get('rank')) {
            newParams.delete('rank')
            modified = true
          }
          if (newParams.get('reverse')) {
            newParams.delete('reverse')
            modified = true
          }

          if (modified) {
            const qs = newParams.toString()
            window.history.replaceState(null, '', qs ? `.?${qs}` : '.')
          }
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getEpisodes()
        .then(() => { console.log('episodes done') })
        .catch(err => {
          console.error(err)
          setEpisodesError(/** @type {Error} */(err))
        })
        .finally(() => { setEpisodesLoading(false) })
    }
  }, [query, state.apiUrl, state.sensitive, state.starred, state.toread, dataReload])

  const title = queryValue ? ['📼', queryValue, '|', 'Episodes Search'] : []
  useTitle(...title)

  const onPageNav = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ ev) => {
    ev.preventDefault()
    if (pushState && window) {
      pushState(ev.currentTarget.href)
      window.scrollTo({ top: 0 })
    }
  }, [window, pushState])

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`./?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  const hasPending = Array.isArray(episodes) && episodes.some(episode => (
    episode?.ready === false && !episode?.error
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reload,
  })

  let nextParams
  if (next) {
    nextParams = new URLSearchParams(query || '')
    nextParams.set('query', next.query)
    nextParams.set('rank', next.rank)
    nextParams.set('id', next.id)
    nextParams.set('reverse', next.reverse)
  }

  let prevParams
  if (prev) {
    prevParams = new URLSearchParams(query || '')
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
        ${episodesError ? html`<div>${episodesError.message}</div>` : null}
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
                reload,
                onDelete: reload
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

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
