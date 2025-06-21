/* eslint-env browser */
import { Component, html, render, useEffect, useCallback, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { episodeList } from '../components/episode/episode-list.js'
import { search } from '../components/search/index.js'
import { createPageNavHandler } from '../components/view-transition/index.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [episodes, setEpisodes] = useState()
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError] = useState(null)

  const [before, setBefore] = useState()
  const [after, setAfter] = useState()

  // Need a better way to trigger reloads
  const [episodeReload, setEpisodeReload] = useState(0)
  const reloadEpisodes = useCallback(() => {
    setEpisodeReload(episodeReload + 1)
  }, [episodeReload, setEpisodeReload])

  // Require a user
  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  // Load episodes
  useEffect(() => {
    const controller = new AbortController()

    async function getEpisodes () {
      setEpisodesLoading(true)
      setEpisodesError(null)
      const pageParams = new URLSearchParams(query)
      const requestParams = new URLSearchParams()

      // Transform date string to date object
      if (pageParams.get('before')) requestParams.set('before', (new Date(+pageParams.get('before'))).toISOString())
      if (pageParams.get('after')) requestParams.set('after', (new Date(+pageParams.get('after'))).toISOString())
      if (pageParams.get('bid')) requestParams.set('bookmark_id', pageParams.get('bid'))

      requestParams.set('sensitive', state.sensitive)
      requestParams.set('include_feed', true)

      const response = await fetch(`${state.apiUrl}/episodes?${requestParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
        signal: controller.signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setEpisodes(body?.data)
        setBefore(body?.pagination?.before ? new Date(body?.pagination?.before) : null)
        setAfter(body?.pagination?.after ? new Date(body?.pagination?.after) : null)

        if (body?.pagination?.top) {
          const newParams = new URLSearchParams(query)
          let modified = false
          if (newParams.get('before')) {
            newParams.delete('before')
            modified = true
          }
          if (newParams.get('after')) {
            newParams.delete('after')
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
  }, [query, state.apiUrl, state.sensitive, episodeReload])

  const onPageNav = useCallback(
    createPageNavHandler(pushState, window),
    [window, pushState]
  )

  const handleSearch = useCallback((query) => {
    window.location.replace(`/search/episodes/?query=${encodeURIComponent(query)}`)
  }, [window])

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query)
    beforeParams.set('before', before.valueOf())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query)
    afterParams.set('after', after.valueOf())
    afterParams.delete('before')
  }

  return html`
  ${search({
    placeholder: 'Search Episodes...',
    onSearch: handleSearch,
  })}
  <div class="bc-pagination-top">
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
  </div>
  <div class="bc-episode-list">
    ${episodesLoading && !Array.isArray(episodes) ? html`<div>...</div>` : null}
    ${episodesError ? html`<div>${episodesError.message}</div>` : null}
    ${Array.isArray(episodes)
        ? episodes.map(e => html.for(e, e.id)`${episodeList({ episode: e, reload: reloadEpisodes, onDelete: reloadEpisodes, clickForPreview: true })}`)
        : null}
  </div>
  <div class="bc-pagination-bottom">
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
  </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
