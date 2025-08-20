/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js' */
/** @import { TypeFeedRead } from '../../routes/api/feeds/schemas/schema-feed-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useCallback, useState } from 'preact/hooks'
import { tc } from '../lib/typed-component.js'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { EpisodeList } from '../components/episode/episode-list.js'
import { FeedHeader } from '../components/feed-header/feed-header.js'
import { Search } from '../components/search/index.js'
import { useReload } from '../hooks/useReload.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()
  const { reload: reloadEpisodes, signal: episodesReload } = useReload()
  const { reload: reloadFeed, signal: feedReload } = useReload()

  const [episodes, setEpisodes] = useState(/** @type {TypeEpisodeReadClient[] | undefined} */(undefined))
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError] = useState(/** @type {Error | null} */(null))

  const [feed, setFeed] = useState(/** @type {TypeFeedRead | undefined} */(undefined))
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(/** @type {Error | null} */(null))

  const [before, setBefore] = useState(/** @type {Date | undefined} */(undefined))
  const [after, setAfter] = useState(/** @type {Date | undefined} */(undefined))

  // Load episodes
  useEffect(() => {
    const controller = new AbortController()

    async function getEpisodes () {
      setEpisodesLoading(true)
      setEpisodesError(null)
      const pageParams = new URLSearchParams(query || '')

      // Transform date string to date object
      const beforeParam = pageParams.get('before')
      const afterParam = pageParams.get('after')
      if (beforeParam) pageParams.set('before', (new Date(+beforeParam)).toISOString())
      if (afterParam) pageParams.set('after', (new Date(+afterParam)).toISOString())

      pageParams.set('sensitive', state.sensitive.toString())

      pageParams.set('ready', 'true')

      if (!pageParams.get('feed_id')) {
        pageParams.set('default_feed', 'true')
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
        setBefore(body?.pagination?.before ? new Date(body?.pagination?.before) : undefined)
        setAfter(body?.pagination?.after ? new Date(body?.pagination?.after) : undefined)

        if (body?.pagination?.top && window) {
          const newParams = new URLSearchParams(query || '')
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
  }, [query, state.apiUrl, state.sensitive, episodesReload])

  // Get Feed
  useEffect(() => {
    const controller = new AbortController()

    async function getFeed () {
      setFeedLoading(true)
      setFeedError(null)
      const pageParams = new URLSearchParams(query || '')

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
        .catch(err => {
          console.error(err)
          setFeedError(/** @type {Error} */(err))
        })
        .finally(() => { setFeedLoading(false) })
    }
  }, [state.apiUrl, feedReload])

  const onPageNav = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
    ev.preventDefault()
    if (pushState && window) {
      pushState(ev.currentTarget.href)
      window.scrollTo({ top: 0 })
    }
  }, [window, pushState])

  const handleSearch = useCallback((/** @type {string} */query) => {
    if (window) {
      window.location.replace(`/search/episodes/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query || '')
    beforeParams.set('before', before.valueOf().toString())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query || '')
    afterParams.set('after', after.valueOf().toString())
    afterParams.delete('before')
  }

  return html`
    <${Search}
      placeholder="Search Feed..."
      onSearch=${handleSearch}
    />
    <div>
      ${feed ? tc(FeedHeader, { feed, reload: reloadFeed }) : null}
      ${feedLoading ? html`<div>Loading feed...</div>` : null}
      ${feedError ? html`<div>${feedError.message}</div>` : null}
    </div>
    <div>
      ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
    </div>
    ${episodesLoading && !Array.isArray(episodes) ? html`<div>...</div>` : null}
    ${episodesError ? html`<div>${episodesError.message}</div>` : null}
    ${Array.isArray(episodes)
      ? episodes.map(e => tc(EpisodeList, {
          episode: e,
          reload: reloadEpisodes,
          onDelete: reloadEpisodes,
          clickForPreview: true
        }, e.id))
      : null}
    <div>
      ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
