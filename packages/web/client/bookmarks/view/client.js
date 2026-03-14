/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { html } from 'htm/preact'
import { useEffect, useCallback, useMemo } from 'preact/hooks'
import { useQuery, useQueryClient } from '@tanstack/preact-query'
import { tc } from '../../lib/typed-component.js'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useSearchParams } from '../../hooks/useSearchParms.js'
import { BookmarkList } from '../../components/bookmark/bookmark-list.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'
import { mountPage } from '../../lib/mount-page.js'
import { withinResolvingWindow } from '../../hooks/resolve-timeout.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { params } = useSearchParams(['id'])
  const queryClient = useQueryClient()
  const bookmarkId = params['id']

  useEffect(() => {
    if (!window) return
    if (!bookmarkId) {
      window.location.replace('/bookmarks')
    }
  }, [bookmarkId, window])

  const queryKey = useMemo(() => ([
    'bookmark-view',
    bookmarkId,
    state.apiUrl,
    state.sensitive,
  ]), [bookmarkId, state.apiUrl, state.sensitive])

  const { data: bookmark, isPending: bookmarkLoading, error: bookmarkError } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const requestParams = new URLSearchParams()
      requestParams.set('sensitive', state.sensitive.toString())

      const response = await fetch(`${state.apiUrl}/bookmarks/${bookmarkId}?${requestParams.toString()}`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        return /** @type {TypeBookmarkReadClient} */ (await response.json())
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    enabled: Boolean(user) && Boolean(bookmarkId),
  })

  const reload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const handleDelete = useCallback(() => {
    if (bookmark && window) {
      const beforeString = new Date(bookmark.created_at).valueOf()
      window.location.replace(`/bookmarks?after=${beforeString}`)
    }
  }, [bookmark?.created_at, window])

  const title = bookmark?.title ? ['🔖', bookmark?.title] : []
  useTitle(...title)

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`/search/bookmarks/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  const hasPending = Boolean(
    bookmark && withinResolvingWindow(bookmark?.created_at) && (
      bookmark?.done === false ||
      (bookmark.archives?.some(archive => archive?.ready === false && !archive?.error)) ||
      (bookmark.episodes?.some(episode => episode?.ready === false && !episode?.error))
    )
  )

  useResolvePolling({
    enabled: hasPending,
    onPoll: reload,
  })

  return html`
    <div>
      <${Search}
        placeholder="Search Bookmarks..."
        onSearch=${handleSearch}
        autofocus=${true}
      />
      ${bookmarkLoading && !bookmark ? html`<div>...</div>` : null}
      ${bookmarkError ? html`<div>${/** @type {Error} */(bookmarkError).message}</div>` : null}
      ${bookmark
        ? tc(BookmarkList, {
            bookmark,
            onDelete: handleDelete,
            onInvalidate: reload,
          })
        : null}
    </div>
  `
}

mountPage(Page)
