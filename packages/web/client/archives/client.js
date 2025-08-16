/* eslint-env browser */
import { Component, html, render, useEffect, useCallback, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { archiveList } from '../components/archive/archive-list.js'
import { search } from '../components/search/index.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [archives, setArchives] = useState()
  const [archivesLoading, setArchivesLoading] = useState(false)
  const [archivesError, setArchivesError] = useState(null)

  const [before, setBefore] = useState()
  const [after, setAfter] = useState()

  // Need a better way to trigger reloads
  const [archiveReload, setArchiveReload] = useState(0)
  const reloadArchives = useCallback(() => {
    setArchiveReload(archiveReload + 1)
  }, [archiveReload, setArchiveReload])

  // Require a user
  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  // Load archives
  useEffect(() => {
    async function getArchives () {
      setArchivesLoading(true)
      setArchivesError(null)
      const pageParams = new URLSearchParams(query)
      const reqParams = new URLSearchParams()

      // Transform date string to date object
      if (pageParams.get('before')) reqParams.set('before', (new Date(+pageParams.get('before'))).toISOString())
      if (pageParams.get('after')) reqParams.set('after', (new Date(+pageParams.get('after'))).toISOString())
      if (pageParams.get('bid')) reqParams.set('bookmark_id', pageParams.get('bid'))

      reqParams.set('sensitive', state.sensitive)
      reqParams.set('toread', state.toread)
      reqParams.set('starred', state.starred)
      reqParams.set('full_archives', false)
      reqParams.set('ready', true)

      const response = await fetch(`${state.apiUrl}/archives?${reqParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setArchives(body?.data)
        setBefore(body?.pagination?.before ? new Date(body?.pagination?.before) : null)
        setAfter(body?.pagination?.after ? new Date(body?.pagination?.after) : null)

        if (body?.pagination?.top) {
          const newParams = new URLSearchParams(query)
          let modified = false
          if (newParams.get('before')) {
            newParams.delete('before')
            modified = true
          }
          if (newParams.get('after')) {
            newParams.delete('after')
            modified = true
          }

          if (modified) {
            const qs = newParams.toString()
            window.history.replaceState(null, null, qs ? `.?${qs}` : '.')
          }
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getArchives()
        .then(() => { console.log('archives done') })
        .catch(err => { console.error(err); setArchivesError(err) })
        .finally(() => { setArchivesLoading(false) })
    }
  }, [query, state.apiUrl, state.sensitive, state.toread, state.starred, archiveReload])

  const onPageNav = useCallback((ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    window.scrollTo({ top: 0 })
  }, [window, pushState])

  const handleSearch = useCallback((query) => {
    window.location.replace(`/search/archives/?query=${encodeURIComponent(query)}`)
  }, [window])

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query)
    beforeParams.set('before', before.valueOf())
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query)
    afterParams.set('after', after.valueOf())
    afterParams.delete('before')
  }

  return html`
  ${search({
    placeholder: 'Search Archives...',
    onSearch: handleSearch,
  })}
  <div>
    ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
  <div>
  ${archivesLoading && !Array.isArray(archives) ? html`<div>...</div>` : null}
  ${archivesError ? html`<div>${archivesError.message}</div>` : null}
  ${Array.isArray(archives)
      ? archives.map(ar => html.for(ar, ar.id)`${archiveList({ archive: ar, reload: reloadArchives, onDelete: reloadArchives, clickForPreview: true })}`)
      : null}
  <div>
    ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
  <div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
