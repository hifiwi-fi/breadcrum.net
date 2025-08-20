/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState, useCallback } from 'preact/hooks'
import { tc } from '../../lib/typed-component.js'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useTitle } from '../../hooks/useTitle.js'
import { EpisodeList } from '../../components/episode/episode-list.js'
import { Search } from '../../components/search/index.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()

  const [episode, setEpisode] = useState(/** @type {TypeEpisodeReadClient | undefined} */(undefined))
  const [episodeLoading, setEpisodeLoading] = useState(false)
  const [episodeError, setEpisodeError] = useState(/** @type {Error | null} */(null))

  const [episodeReload, setEpisodeReload] = useState(0)

  const reloadEpisode = useCallback(() => {
    console.log(episodeReload)
    setEpisodeReload(episodeReload + 1)
  }, [episodeReload, setEpisodeReload])

  const handleDelete = useCallback(() => {
    if (episode?.bookmark?.id && window) {
      window.location.replace(`/bookmarks/view?id=${episode.bookmark.id}`)
    }
  }, [episode?.bookmark?.id])

  useEffect(() => {
    const controller = new AbortController()

    async function getEpisode () {
      if (!window) return

      setEpisodeLoading(true)
      setEpisodeError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/episodes')
        return
      }

      const requestParams = new URLSearchParams()

      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('include_feed', 'true')

      const response = await fetch(`${state.apiUrl}/episodes/${id}?${requestParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
        signal: controller.signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setEpisode(body)
      } else {
        setEpisode(undefined)
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getEpisode()
        .then(() => { console.log('episode done') })
        .catch(err => {
          console.error(err)
          setEpisodeError(/** @type {Error} */(err))
        })
        .finally(() => { setEpisodeLoading(false) })
    }
  }, [episodeReload, state.apiUrl, state.sensitive])

  const title = episode?.display_title ? ['📼', episode?.display_title] : []
  useTitle(...title)

  const handleSearch = useCallback((/** @type {string} */query) => {
    if (window) {
      window.location.replace(`/search/episodes/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  return html`
    <div>
      <${Search}
        placeholder="Search Episodes..."
        onSearch=${handleSearch}
      />
      ${episodeLoading ? html`<div>...</div>` : null}
      ${episodeError ? html`<div>${episodeError.message}</div>` : null}
      ${episode
        ? tc(EpisodeList, {
            episode,
            reload: reloadEpisode,
            onDelete: handleDelete,
            clickForPreview: false
          })
        : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
