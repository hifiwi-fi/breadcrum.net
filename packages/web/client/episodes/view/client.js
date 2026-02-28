/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js' */

import { html } from 'htm/preact'
import { useEffect, useCallback, useMemo } from 'preact/hooks'
import { useQuery, useQueryClient } from '@tanstack/preact-query'
import { tc } from '../../lib/typed-component.js'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useSearchParams } from '../../hooks/useQuery.js'
import { useTitle } from '../../hooks/useTitle.js'
import { EpisodeList } from '../../components/episode/episode-list.js'
import { Search } from '../../components/search/index.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'
import { mountPage } from '../../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { params } = useSearchParams(['id'])
  const queryClient = useQueryClient()
  const episodeId = params['id']

  useEffect(() => {
    if (!window) return
    if (!episodeId) {
      window.location.replace('/episodes')
    }
  }, [episodeId, window])

  const queryKey = useMemo(() => ([
    'episode-view',
    episodeId,
    state.apiUrl,
    state.sensitive,
  ]), [episodeId, state.apiUrl, state.sensitive])

  const { data: episode, isPending: episodeLoading, error: episodeError } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const requestParams = new URLSearchParams()
      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('include_feed', 'true')

      const response = await fetch(`${state.apiUrl}/episodes/${episodeId}?${requestParams.toString()}`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        return /** @type {TypeEpisodeReadClient} */ (await response.json())
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    enabled: Boolean(user) && Boolean(episodeId),
  })

  const reloadEpisode = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const handleDelete = useCallback(() => {
    if (episode?.bookmark?.id && window) {
      window.location.replace(`/bookmarks/view?id=${episode.bookmark.id}`)
    }
  }, [episode?.bookmark?.id, window])

  const title = episode?.display_title ? ['📼', episode?.display_title] : []
  useTitle(...title)

  const handleSearch = useCallback((/** @type {string} */query) => {
    if (window) {
      window.location.replace(`/search/episodes/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  const hasPending = Boolean(episode && episode?.ready === false && !episode?.error)

  useResolvePolling({
    enabled: hasPending,
    onPoll: reloadEpisode,
  })

  return html`
    <div>
      <${Search}
        placeholder="Search Episodes..."
        onSearch=${handleSearch}
        autofocus=${true}
      />
      ${episode
        ? tc(EpisodeList, {
            episode,
            onDelete: handleDelete,
            clickForPreview: false,
            showError: true,
            fullView: true,
          })
        : null}
      ${episodeLoading && !episode ? html`<div>...</div>` : null}
      ${episodeError ? html`<div>${/** @type {Error} */(episodeError).message}</div>` : null}
    </div>
  `
}

mountPage(Page)
