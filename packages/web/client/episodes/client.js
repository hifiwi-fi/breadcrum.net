/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useCallback, useState } from 'preact/hooks'
import { tc } from '../lib/typed-component.js'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { EpisodeList } from '../components/episode/episode-list.js'
import { Search } from '../components/search/index.js'
import { PaginationButtons } from '../components/pagination-buttons/index.js'
import { useResolvePolling } from '../hooks/useResolvePolling.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [episodes, setEpisodes] = useState(/** @type {TypeEpisodeReadClient[] | undefined} */(undefined))
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError] = useState(/** @type {Error | null} */(null))

  const [before, setBefore] = useState(/** @type {Date | undefined} */(undefined))
  const [after, setAfter] = useState(/** @type {Date | undefined} */(undefined))

  // Need a better way to trigger reloads
  const [episodeReload, setEpisodeReload] = useState(0)
  const reloadEpisodes = useCallback(() => {
    setEpisodeReload(episodeReload + 1)
  }, [episodeReload, setEpisodeReload])

  // Load episodes
  useEffect(() => {
    const controller = new AbortController()

    async function getEpisodes () {
      setEpisodesLoading(true)
      setEpisodesError(null)
      const pageParams = new URLSearchParams(query || '')
      const requestParams = new URLSearchParams()

      // Transform date string to date object
      const beforeParam = pageParams.get('before')
      const afterParam = pageParams.get('after')
      if (beforeParam) requestParams.set('before', (new Date(+beforeParam)).toISOString())
      if (afterParam) requestParams.set('after', (new Date(+afterParam)).toISOString())
      const bidParam = pageParams.get('bid')
      if (bidParam) requestParams.set('bookmark_id', bidParam)

      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('include_feed', 'true')

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
  }, [query, state.apiUrl, state.sensitive, episodeReload])

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

  const hasPending = Array.isArray(episodes) && episodes.some(episode => (
    episode?.ready === false && !episode?.error
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reloadEpisodes,
  })

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
      placeholder="Search Episodes..."
      onSearch=${handleSearch}
      autofocus=${true}
    />
    <${PaginationButtons} onPageNav=${onPageNav} beforeParams=${beforeParams} afterParams=${afterParams} />
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
      <${PaginationButtons} onPageNav=${onPageNav} beforeParams=${beforeParams} afterParams=${afterParams} />
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
