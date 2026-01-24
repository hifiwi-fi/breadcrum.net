/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeArchiveReadClient } from '../../routes/api/archives/schemas/schema-archive-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useCallback, useState } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { ArchiveList } from '../components/archive/archive-list.js'
import { Search } from '../components/search/index.js'
import { PaginationButtons } from '../components/pagination-buttons/index.js'
import { useReload } from '../hooks/useReload.js'
import { useResolvePolling } from '../hooks/useResolvePolling.js'

/**
 * @typedef {Object} ArchivesResponse
 * @property {TypeArchiveReadClient[]} data
 * @property {Object} pagination
 * @property {string | null} pagination.before
 * @property {string | null} pagination.after
 * @property {boolean} pagination.top
 * @property {boolean} pagination.bottom
 */

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [archives, setArchives] = useState(/** @type {TypeArchiveReadClient[] | undefined} */(undefined))
  const [archivesLoading, setArchivesLoading] = useState(false)
  const [archivesError, setArchivesError] = useState(/** @type {Error | null} */(null))

  const [before, setBefore] = useState(/** @type {Date | null} */(null))
  const [after, setAfter] = useState(/** @type {Date | null} */(null))

  const { reload: reloadArchives, signal: archivesReloadSignal } = useReload()

  // Load archives
  useEffect(() => {
    async function getArchives () {
      setArchivesLoading(true)
      setArchivesError(null)
      const pageParams = new URLSearchParams(query || '')
      const reqParams = new URLSearchParams()

      // Transform date string to date object
      const beforeParam = pageParams.get('before')
      const afterParam = pageParams.get('after')
      const bidParam = pageParams.get('bid')
      if (beforeParam) reqParams.set('before', (new Date(+beforeParam)).toISOString())
      if (afterParam) reqParams.set('after', (new Date(+afterParam)).toISOString())
      if (bidParam) reqParams.set('bookmark_id', bidParam)

      reqParams.set('sensitive', state.sensitive.toString())
      reqParams.set('toread', state.toread.toString())
      reqParams.set('starred', state.starred.toString())
      reqParams.set('full_archives', 'false')
      reqParams.set('ready', 'true')

      const response = await fetch(`${state.apiUrl}/archives?${reqParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        /** @type {ArchivesResponse} */
        const body = await response.json()
        setArchives(body?.data)
        setBefore(body?.pagination?.before ? new Date(body?.pagination?.before) : null)
        setAfter(body?.pagination?.after ? new Date(body?.pagination?.after) : null)

        if (body?.pagination?.top) {
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

          if (modified && window) {
            const qs = newParams.toString()
            window.history.replaceState(null, '', qs ? `.?${qs}` : '.')
          }
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getArchives()
        .then(() => { console.log('archives done') })
        .catch(err => {
          console.error(err)
          setArchivesError(/** @type {Error} */(err))
        })
        .finally(() => { setArchivesLoading(false) })
    }
  }, [query, state.apiUrl, state.sensitive, state.toread, state.starred, archivesReloadSignal, user?.id, window])

  const onPageNav = useCallback((/** @type {Event} */ ev) => {
    ev.preventDefault()
    const target = /** @type {HTMLAnchorElement | null} */ (ev.currentTarget)
    if (pushState && window && target?.href) {
      pushState(target.href)
      window.scrollTo({ top: 0 })
    }
  }, [window, pushState])

  const onDateNav = useCallback((/** @type {string} */ url) => {
    if (pushState && window) {
      const resolvedUrl = new URL(url, window.location.href).toString()
      pushState(resolvedUrl)
      window.scrollTo({ top: 0 })
    }
  }, [window, pushState])

  const handleSearch = useCallback((/** @type {string} */ query) => {
    if (window) {
      window.location.replace(`/search/archives/?query=${encodeURIComponent(query)}`)
    }
  }, [window])

  const dateParams = new URLSearchParams(query || '')
  const formatDateValue = (/** @type {Date | null} */ date) => {
    if (!date || Number.isNaN(date.valueOf())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const cursorDate = (() => {
    const beforeCursor = dateParams.get('before')
    const afterCursor = dateParams.get('after')
    const cursor = beforeCursor ?? afterCursor
    if (!cursor) return null
    const cursorValue = Number(cursor)
    if (Number.isNaN(cursorValue)) return null
    const adjusted = beforeCursor ? cursorValue - 1 : cursorValue
    const date = new Date(adjusted)
    return Number.isNaN(date.valueOf()) ? null : date
  })()

  const hasArchives = Array.isArray(archives) && archives.length > 0
  const topArchiveCreatedAt = hasArchives ? archives[0]?.created_at : null
  const bottomArchiveCreatedAt = hasArchives
    ? archives[archives.length - 1]?.created_at
    : null
  const topArchiveDate = topArchiveCreatedAt ? new Date(topArchiveCreatedAt) : null
  const bottomArchiveDate = bottomArchiveCreatedAt ? new Date(bottomArchiveCreatedAt) : null
  const topDateValue = formatDateValue(topArchiveDate) || formatDateValue(cursorDate)
  const bottomDateValue = formatDateValue(bottomArchiveDate) || formatDateValue(cursorDate)

  const hasPending = Array.isArray(archives) && archives.some(archive => (
    archive?.ready === false && !archive?.error
  ))

  useResolvePolling({
    enabled: hasPending,
    onPoll: reloadArchives,
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
      placeholder="Search Archives..."
      onSearch=${handleSearch}
      autofocus=${true}
    />
    <${PaginationButtons} onPageNav=${onPageNav} onDateNav=${onDateNav} dateParams=${dateParams} dateValue=${topDateValue} beforeParams=${beforeParams} afterParams=${afterParams} />
    ${archivesLoading && !Array.isArray(archives) ? html`<div>...</div>` : null}
    ${archivesError ? html`<div>${archivesError.message}</div>` : null}
    ${Array.isArray(archives)
        ? archives.map(ar => html`
            <${ArchiveList}
              key=${ar.id}
              archive=${ar}
              reload=${reloadArchives}
              onDelete=${reloadArchives}
              clickForPreview=${true}
            />
          `)
        : null}
    <${PaginationButtons} onPageNav=${onPageNav} onDateNav=${onDateNav} dateParams=${dateParams} dateValue=${bottomDateValue} beforeParams=${beforeParams} afterParams=${afterParams} />
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
