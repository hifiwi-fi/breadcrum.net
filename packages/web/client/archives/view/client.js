/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js' */

import { html } from 'htm/preact'
import { useEffect, useCallback, useMemo } from 'preact/hooks'
import { useQuery, useQueryClient } from '@tanstack/preact-query'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useSearchParams } from '../../hooks/useSearchParams.js'
import { useTitle } from '../../hooks/useTitle.js'
import { ArchiveList } from '../../components/archive/archive-list.js'
import { Search } from '../../components/search/index.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'
import { mountPage } from '../../lib/mount-page.js'
import { withinResolvingWindow } from '../../hooks/resolve-timeout.js'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'
import { useOfflineReadSync } from '../../hooks/useOfflineReadSync.js'
import { useOfflineArchive } from '../../hooks/useOfflineArchives.js'
import { prepareOfflinePersistenceForCurrentUser } from '../../lib/offline/offline-db.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { params } = useSearchParams(['id', 'offline_db_spike'])
  const queryClient = useQueryClient()
  const archiveId = params['id']
  const online = useOnlineStatus()
  const showOfflineDbSpike = params['offline_db_spike'] === 'true'
  const useOfflineData = showOfflineDbSpike && !online

  useOfflineReadSync({ enabled: showOfflineDbSpike })

  useEffect(() => {
    if (!window) return
    if (!archiveId) {
      window.location.replace('/archives')
    }
  }, [archiveId, window])

  const queryKey = useMemo(() => ([
    'archive-view',
    archiveId,
    state.apiUrl,
    state.sensitive,
  ]), [archiveId, state.apiUrl, state.sensitive])

  const {
    data: networkArchive,
    isPending: networkArchiveLoading,
    error: networkArchiveError,
  } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const requestParams = new URLSearchParams()
      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('full_archives', 'true')

      const response = await fetch(`${state.apiUrl}/archives/${archiveId}?${requestParams.toString()}`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        return /** @type {TypeArchiveReadClient} */ (await response.json())
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    enabled: Boolean(user) && Boolean(archiveId) && !useOfflineData,
  })

  const {
    archive: offlineArchive,
    archiveLoading: offlineArchiveLoading,
    archiveError: offlineArchiveError,
    reloadArchive: reloadOfflineArchive,
  } = useOfflineArchive(archiveId, { enabled: showOfflineDbSpike })

  const archive = useOfflineData ? offlineArchive : networkArchive
  const archiveLoading = useOfflineData ? offlineArchiveLoading : networkArchiveLoading
  const archiveError = useOfflineData ? offlineArchiveError : networkArchiveError

  const reloadArchive = useCallback(async () => {
    if (useOfflineData) {
      await reloadOfflineArchive()
      return
    }

    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey, reloadOfflineArchive, useOfflineData])

  const handleDelete = useCallback(() => {
    if (window && archive?.bookmark?.id) {
      window.location.replace(`/bookmarks/view?id=${archive.bookmark.id}`)
    }
  }, [archive?.bookmark?.id, window])

  const title = archive?.title ? ['🗄️', archive?.title] : []
  useTitle(...title)

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`/search/archives/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  const hasPending = Boolean(archive && archive?.ready === false && !archive?.error && withinResolvingWindow(archive?.created_at))

  useResolvePolling({
    enabled: hasPending && online,
    onPoll: reloadArchive,
  })

  const showOfflineMissing = useOfflineData && !archiveLoading && !archiveError && !archive

  return html`
    <div>
      <${Search}
        placeholder="Search Archives..."
        onSearch=${handleSearch}
        autofocus=${true}
      />
      ${archiveLoading && !archive ? html`<div>...</div>` : null}
      ${archiveError ? html`<div>${/** @type {Error} */(archiveError).message}</div>` : null}
      ${showOfflineMissing ? html`<div>No synced archive available.</div>` : null}
      ${archive
? html`
        <${ArchiveList}
          archive=${archive}
          onDelete=${handleDelete}
          onInvalidate=${reloadArchive}
          fullView=${true}
        />
      `
: null}
    </div>
  `
}

mountPage(Page, { beforeMount: prepareOfflinePersistenceForCurrentUser })
