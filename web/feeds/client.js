/* eslint-env browser */
import { Component, html, render, useEffect, useCallback, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { episodeList } from '../components/episode/episode-list.js'
import { feedHeader } from '../components/feed-header/feed-header.js'

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
  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  // Require a user
  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
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

      const response = await fetch(`${state.apiUrl}/episodes?${pageParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        },
        signal: controller.signal,
        credentials: 'include'
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
  }, [query, state.apiUrl])

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
          'accept-encoding': 'application/json'
        },
        signal: controller.signal,
        credentials: 'include'
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
  }, [query, state.apiUrl])

  // Get Feeds
  useEffect(() => {
    const controller = new AbortController()

    async function getFeeds () {
      setFeedsLoading(true)
      setFeedsError(null)

      const response = await fetch(`${state.apiUrl}/feeds/`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        },
        signal: controller.signal,
        credentials: 'include'
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
  }, [query, state.apiUrl])

  const onPageNav = (ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    window.scrollTo({ top: 0 })
  }

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query)
    beforeParams.set('before', before.valueOf())
    beforeParams.delete('after')
  }

  let afterParms
  if (after) {
    afterParms = new URLSearchParams(query)
    afterParms.set('after', after.valueOf())
    afterParms.delete('before')
  }

  return html`
  <div>
    ${feedLoading && feedsLoading ? 'loading feed' : feedHeader({ feed, feeds, reload })}
    ${feedError ? html`<div>${feedError.message}</div>` : null}
    ${feedsError ? html`<div>${feedsError.message}</div>` : null}
  </div>
  <div>
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParms}>later</span>` : null}
  <div>
  ${episodesLoading && !Array.isArray(episodes) ? html`<div>...</div>` : null}
  ${episodesError ? html`<div>${episodesError.message}</div>` : null}
  ${Array.isArray(episodes)
      ? episodes.map(e => html.for(e, e.id)`${episodeList({ episode: e, reload })}`)
      : null}
  <div>
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParms}>later</span>` : null}
  <div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
