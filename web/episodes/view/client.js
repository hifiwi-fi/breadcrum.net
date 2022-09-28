/* eslint-env browser */
import { Component, html, render, useEffect, useState, useCallback } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { episodeList } from '../../components/episode/episode-list.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()

  const [episode, setEpisode] = useState()
  const [episodeLoading, setEpisodeLoading] = useState(false)
  const [episodeError, setEpisodeError] = useState(null)

  const [episodeReload, setEpisodeReload] = useState(0)

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  const reloadEpisode = useCallback(() => {
    console.log(episodeReload)
    setEpisodeReload(episodeReload + 1)
  }, [episodeReload, setEpisodeReload])

  useEffect(() => {
    const controller = new AbortController()

    async function getEpisode () {
      setEpisodeLoading(true)
      setEpisodeError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/episodes')
      }

      const requestParams = new URLSearchParams()

      requestParams.set('sensitive', state.sensitive)
      requestParams.set('include_feed', true)

      const response = await fetch(`${state.apiUrl}/episodes/${id}?${requestParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        },
        signal: controller.signal,
        credentials: 'include'
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setEpisode(body)
      } else {
        setEpisode(null)
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getEpisode()
        .then(() => { console.log('episode done') })
        .catch(err => { console.error(err); setEpisodeError(err) })
        .finally(() => { setEpisodeLoading(false) })
    }
  }, [episodeReload, state.apiUrl, state.sensitive])

  return html`
    <div>
      ${episodeLoading ? html`<div>...</div>` : null}
      ${episodeError ? html`<div>${episodeError.message}</div>` : null}
      ${episode ? episodeList({ episode, reload: reloadEpisode }) : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
