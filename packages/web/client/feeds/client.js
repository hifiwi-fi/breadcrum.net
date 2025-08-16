/* eslint-env browser */
import { Component, html, render, useEffect, useCallback, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { episodeList } from '../components/episode/episode-list.js'
import { feedHeader } from '../components/feed-header/feed-header.js'
import { search } from '../components/search/index.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [episodes, setEpisodes] = useState()
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError] = useState(null)

  const [feed, setFeed] = useState()
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)

  const [feeds, setFeeds] = useState()
  const [feedsLoading, setFeedsLoading] = useState(false)
  const [feedsError, setFeedsError] = useState(null)

  const [before, setBefore] = useState()
  const [after, setAfter] = useState()

  // Need a better way to trigger reloads
  const [episodesReload, setEpisodesReload] = useState(0)
  const reloadEpisodes = useCallback(() => {
    setEpisodesReload(episodesReload + 1)
  }, [episodesReload, setEpisodesReload])

  // Need a better way to trigger reloads
  const [feedReload, setFeedReload] = useState(0)
  const reloadFeed = useCallback(() => {
    setFeedReload(feedReload + 1)
  }, [feedReload, setFeedReload])

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

      // Transform date string to date object
      if (pageParams.get('before')) pageParams.set('before', (new Date(+pageParams.get('before'))).toISOString())
      if (pageParams.get('after')) pageParams.set('after', (new Date(+pageParams.get('after'))).toISOString())

      pageParams.set('sensitive', state.sensitive)

      pageParams.set('ready', true)

      if (!pageParams.get('feed_id')) {
        pageParams.set('default_feed', true)
      }

      const response = await fetch(`${state.apiUrl}/episodes?${pageParams.toString()}`, {
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
  }, [query, state.apiUrl, state.sensitive, episodesReload])

  // Get Feed
  useEffect(() => {
    const controller = new AbortController()

    async function getFeed () {
      setFeedLoading(true)
      setFeedError(null)
      const pageParams = new URLSearchParams(query)

      const requestURL = pageParams.get('feed_id')
        ? `/feeds/${pageParams.get('feed_id')}/details/`
        : '/feeds/default-feed/details'

      const response = await fetch(`${state.apiUrl}${requestURL}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
        signal: controller.signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setFeed(body?.data)
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getFeed()
        .then(() => { console.log('feed done') })
        .catch(err => { console.error(err); setFeedError(err) })
        .finally(() => { setFeedLoading(false) })
    }
  }, [state.apiUrl, feedReload])

  // Get Feeds
  useEffect(() => {
    const controller = new AbortController()

    async function getFeeds () {
      setFeedsLoading(true)
      setFeedsError(null)

      const response = await fetch(`${state.apiUrl}/feeds/`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
        signal: controller.signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setFeeds(body?.data)
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getFeeds()
        .then(() => { console.log('feed done') })
        .catch(err => { console.error(err); setFeedsError(err) })
        .finally(() => { setFeedsLoading(false) })
    }
  }, [state.apiUrl, feedReload])

  const onPageNav = useCallback((ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    window.scrollTo({ top: 0 })
  }, [window, pushState])

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
    placeholder: 'Search Feed...',
    onSearch: handleSearch,
  })}
  <div>
    ${feedHeader({ feed, feeds, reload: reloadFeed, loading: feedLoading && feedsLoading })}
    ${feedError ? html`<div>${feedError.message}</div>` : null}
    ${feedsError ? html`<div>${feedsError.message}</div>` : null}
  </div>
  <div>
    ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
  </div>
  ${episodesLoading && !Array.isArray(episodes) ? html`<div>...</div>` : null}
  ${episodesError ? html`<div>${episodesError.message}</div>` : null}
  ${Array.isArray(episodes)
      ? episodes.map(e => html.for(e, e.id)`${episodeList({ episode: e, reload: reloadEpisodes, clickForPreview: true })}`)
      : null}
  <div>
    ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
  </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
