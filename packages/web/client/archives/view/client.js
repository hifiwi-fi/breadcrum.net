/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState, useCallback } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useTitle } from '../../hooks/useTitle.js'
import { ArchiveList } from '../../components/archive/archive-list.js'
import { Search } from '../../components/search/index.js'
import { useReload } from '../../hooks/useReload.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()

  const [archive, setArchive] = useState(/** @type {TypeArchiveReadClient | null} */(null))
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState(/** @type {Error | null} */(null))
  const { reload: reloadArchive, signal: archiveReload } = useReload()

  const handleDelete = useCallback(() => {
    if (window && archive?.bookmark?.id) {
      window.location.replace(`/bookmarks/view?id=${archive.bookmark.id}`)
    }
  }, [archive?.bookmark?.id, window])

  useEffect(() => {
    async function getArchive () {
      if (!window) return

      setArchiveLoading(true)
      setArchiveError(null)

      const pageParams = new URLSearchParams(window.location.search)

      const id = pageParams.get('id')

      if (!id) {
        window.location.replace('/archives')
        return
      }

      const requestParams = new URLSearchParams()

      requestParams.set('sensitive', state.sensitive.toString())
      requestParams.set('full_archives', 'true')

      try {
        const response = await fetch(`${state.apiUrl}/archives/${id}?${requestParams.toString()}`, {
          method: 'get',
          headers: {
            'accept-encoding': 'application/json',
          },
        })

        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          /** @type {TypeArchiveReadClient} */
          const body = await response.json()
          setArchive(body)
        } else {
          setArchive(null)
          throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
        }
      } catch (err) {
        console.error(err)
        setArchiveError(/** @type {Error} */(err))
      } finally {
        setArchiveLoading(false)
      }
    }

    if (user) {
      getArchive()
        .then(() => { console.log('archive done') })
        .catch(err => {
          console.error(err)
          setArchiveError(/** @type {Error} */(err))
        })
        .finally(() => { setArchiveLoading(false) })
    }
  }, [archiveReload, state.apiUrl, state.sensitive, user?.id])

  const title = archive?.title ? ['🗄️', archive?.title] : []
  useTitle(...title)

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`/search/archives/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  return html`
    <div>
      <${Search}
        placeholder="Search Archives..."
        onSearch=${handleSearch}
      />
      ${archiveLoading ? html`<div>...</div>` : null}
      ${archiveError ? html`<div>${archiveError.message}</div>` : null}
      ${archive
? html`
        <${ArchiveList}
          archive=${archive}
          reload=${reloadArchive}
          onDelete=${handleDelete}
          fullView=${true}
        />
      `
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
