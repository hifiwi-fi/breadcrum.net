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
import { useSearchParams } from '../../hooks/useSearchParams.js'
import { BookmarkList } from '../../components/bookmark/bookmark-list.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'
import { mountPage } from '../../lib/mount-page.js'
import { withinResolvingWindow } from '../../hooks/resolve-timeout.js'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'
import { useOfflineReadSync } from '../../hooks/useOfflineReadSync.js'
import { useOfflineBookmark } from '../../hooks/useOfflineBookmark.js'
import { prepareOfflinePersistenceForCurrentUser } from '../../lib/offline/offline-db.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { params } = useSearchParams(['id', 'offline_db_spike'])
  const queryClient = useQueryClient()
  const bookmarkId = params['id']
  const online = useOnlineStatus()
  const showOfflineDbSpike = params['offline_db_spike'] === 'true'
  const useOfflineData = showOfflineDbSpike && !online

  useOfflineReadSync({ enabled: showOfflineDbSpike })

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

  const {
    data: networkBookmark,
    isPending: networkBookmarkLoading,
    error: networkBookmarkError,
  } = useQuery({
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
    enabled: Boolean(user) && Boolean(bookmarkId) && !useOfflineData,
  })

  const {
    bookmark: offlineBookmark,
    bookmarkLoading: offlineBookmarkLoading,
    bookmarkError: offlineBookmarkError,
    reloadBookmark: reloadOfflineBookmark,
  } = useOfflineBookmark(bookmarkId, { enabled: showOfflineDbSpike })

  const bookmark = useOfflineData ? offlineBookmark : networkBookmark
  const bookmarkLoading = useOfflineData ? offlineBookmarkLoading : networkBookmarkLoading
  const bookmarkError = useOfflineData ? offlineBookmarkError : networkBookmarkError

  const reload = useCallback(async () => {
    if (useOfflineData) {
      await reloadOfflineBookmark()
      return
    }

    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey, reloadOfflineBookmark, useOfflineData])

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
    enabled: hasPending && online,
    onPoll: reload,
  })

  const showOfflineMissing = useOfflineData && !bookmarkLoading && !bookmarkError && !bookmark

  return html`
    <div>
      <${Search}
        placeholder="Search Bookmarks..."
        onSearch=${handleSearch}
        autofocus=${true}
      />
      ${bookmarkLoading && !bookmark ? html`<div>...</div>` : null}
      ${bookmarkError ? html`<div>${/** @type {Error} */(bookmarkError).message}</div>` : null}
      ${showOfflineMissing ? html`<div>No synced bookmark available.</div>` : null}
      ${bookmark
        ? tc(BookmarkList, {
            bookmark,
            onInvalidate: reload,
            onDelete: handleDelete,
            expandSummary: true,
          })
        : null}
    </div>
  `
}

mountPage(Page, { beforeMount: prepareOfflinePersistenceForCurrentUser })
