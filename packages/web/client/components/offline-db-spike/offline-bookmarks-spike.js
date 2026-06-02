/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useMemo } from 'preact/hooks'
import { useLiveQuery } from '@tanstack/react-db'
import { useLSP } from '../../hooks/useLSP.js'
import { getBookmarksCollection } from '../../lib/offline/bookmarks-collection.js'

/**
 * Hidden Phase 0 adapter spike. Enable with `?offline_db_spike=true` on
 * `/bookmarks/` to exercise the React DB adapter through Preact compat.
 *
 * @type {FunctionComponent}
 */
export const OfflineBookmarksDbSpike = () => {
  const state = useLSP()
  const bookmarksCollection = useMemo(() => getBookmarksCollection({
    apiUrl: state.apiUrl,
    userId: state.user?.id ?? null,
    sensitive: state.sensitive,
    toread: state.toread,
    starred: state.starred,
  }), [state.apiUrl, state.sensitive, state.starred, state.toread, state.user?.id])

  const { data: bookmarks, isLoading, isError, status } = useLiveQuery(
    (query) => query.from({ bookmark: bookmarksCollection }),
    [bookmarksCollection]
  )

  return html`
    <div hidden data-offline-db-spike="bookmarks" data-status=${status}>
      ${isLoading ? 'loading' : null}
      ${isError ? 'error' : null}
      ${Array.isArray(bookmarks) ? bookmarks.length : 0}
    </div>
  `
}
