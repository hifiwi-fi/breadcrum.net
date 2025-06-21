/* eslint-env browser */
import { Component, html, render, useEffect, useCallback, useState } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useUser } from '../../hooks/useUser.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useTitle } from '../../hooks/useTitle.js'
import { search } from '../../components/search/index.js'
import { episodeList } from '../../components/episode/episode-list.js'
import { createPageNavHandler } from '../../components/view-transition/index.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [episodes, setEpisodes] = useState()
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError] = useState(null)

  const [next, setNext] = useState()
  const [prev, setPrev] = useState()

  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  // Require a user
  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  const pageParams = new URLSearchParams(query)

  // Search episodes
  useEffect(() => {
    async function getEpisodes () {
      console.log('loading bookmark results')
      setEpisodesLoading(true)
      setEpisodesError(null)

      const queryParams = new URLSearchParams()

      if (pageParams.get('per_page')) queryParams.set('per_page', pageParams.get('per_page') ?? '')
      queryParams.set('query', pageParams.get('query') ?? '')
      if (pageParams.get('id')) queryParams.set('id', pageParams.get('id') ?? '')
      if (pageParams.get('rank')) queryParams.set('rank', pageParams.get('rank') ?? '')
      if (pageParams.get('reverse')) queryParams.set('reverse', pageParams.get('reverse') ?? '')
      queryParams.set('sensitive', state.sensitive)
      queryParams.set('toread', state.toread)
      queryParams.set('starred', state.starred)

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

        if (body?.pagination?.top) {
          const newParams = new URLSearchParams(query)
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
            window.history.replaceState(null, null, qs ? `.?${qs}` : '.')
          }
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getEpisodes()
        .then(() => { console.log('episodes done') })
        .catch(err => { console.error(err); setEpisodesError(err) })
        .finally(() => { setEpisodesLoading(false) })
    }
  }, [query, state.apiUrl, state.sensitive, state.starred, state.toread, dataReload])

  const title = pageParams.get('query') ? ['📼', pageParams.get('query'), '|', 'Episodes Search'] : []
  useTitle(...title)

  const onPageNav = useCallback(
    createPageNavHandler(pushState, window),
    [window, pushState]
  )

  const handleSearch = useCallback((query) => {
    window.location.replace(`./?query=${encodeURIComponent(query)}`)
  }, [window])

  let nextParams
  if (next) {
    nextParams = new URLSearchParams(query)
    nextParams.set('query', next.query)
    nextParams.set('rank', next.rank)
    nextParams.set('id', next.id)
    nextParams.set('reverse', next.reverse)
  }

  let prevParams
  if (prev) {
    prevParams = new URLSearchParams(query)
    prevParams.set('query', prev.query)
    prevParams.set('rank', prev.rank)
    prevParams.set('id', prev.id)
    prevParams.set('reverse', prev.reverse)
  }

  return html`
    ${search({
      placeholder: 'Search Episodes...',
      value: pageParams.get('query'),
      onSearch: handleSearch,
    })}

    <div class="bc-pagination-top">
      ${prev ? html`<a onclick=${onPageNav} href=${'./?' + prevParams}>prev</a>` : null}
      ${next ? html`<a onclick=${onPageNav} href=${'./?' + nextParams}>next</a>` : null}
      🔎
      🔖 <a href="${`../bookmarks?query=${pageParams.get('query')}`}">bookmarks</a>
      🗄️ <a href="${`../archives?query=${pageParams.get('query')}`}">archives</a>
      📼 <a href="${`../episodes?query=${pageParams.get('query')}`}">episodes</a>
    </div>

    <div class="bc-search-results">
      ${episodesLoading && !Array.isArray(episodes) ? html`<div>...</div>` : null}
      ${episodesError ? html`<div>${episodesError.message}</div>` : null}

      ${Array.isArray(episodes)
        ? episodes.map(e => html.for(e, e.id)`${episodeList({ episode: e, reload, onDelete: reload, clickForPreview: true })}`)
        : null}
    </div>

    <div class="bc-pagination-bottom">
      ${prev ? html`<a onclick=${onPageNav} href=${'./?' + prevParams}>prev</a>` : null}
      ${next ? html`<a onclick=${onPageNav} href=${'./?' + nextParams}>next</a>` : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
