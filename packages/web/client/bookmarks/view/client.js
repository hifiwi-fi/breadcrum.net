/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState, useCallback } from 'preact/hooks'
import { tc } from '../../lib/typed-component.js'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { BookmarkList } from '../../components/bookmark/bookmark-list.js'
import { useTitle } from '../../hooks/useTitle.js'
import { Search } from '../../components/search/index.js'
import { useReload } from '../../hooks/useReload.js'
import { useResolvePolling } from '../../hooks/useResolvePolling.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const [bookmark, setBookmark] = useState(/** @type {TypeBookmarkReadClient | null} */(null))
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [bookmarkError, setBookmarkError] = useState(/** @type {Error | null} */(null))
  const { reload, signal } = useReload()

  const handleDelete = useCallback(() => {
    if (bookmark && window) {
      const beforeString = new Date(bookmark.created_at).valueOf()
      window.location.replace(`/bookmarks?after=${beforeString}`)
    }
  }, [bookmark?.created_at])

  useEffect(() => {
    async function getBookmark () {
      if (!window) return

      setBookmarkLoading(true)
      setBookmarkError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/bookmarks')
        return
      }

      const requestParams = new URLSearchParams()

      requestParams.set('sensitive', state.sensitive.toString())

      const response = await fetch(`${state.apiUrl}/bookmarks/${id}?${requestParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        /** @type {TypeBookmarkReadClient} */
        const body = await response.json()
        setBookmark(body)
      } else {
        setBookmark(null)
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getBookmark()
        .then(() => { console.log('bookmarks done') })
        .catch(err => {
          console.error(err)
          setBookmarkError(/** @type {Error} */(err))
        })
        .finally(() => { setBookmarkLoading(false) })
    }
  }, [signal, state.apiUrl, state.sensitive, user?.id])

  const title = bookmark?.title ? ['🔖', bookmark?.title] : []
  useTitle(...title)

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`/search/bookmarks/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  const hasPending = Boolean(
    bookmark && (
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
      ${bookmarkLoading ? html`<div>...</div>` : null}
      ${bookmarkError ? html`<div>${bookmarkError.message}</div>` : null}
      ${bookmark
        ? tc(BookmarkList, {
            bookmark,
            reload,
            onDelete: handleDelete
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
