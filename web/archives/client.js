/* eslint-env browser */
import { Component, html, render, useEffect, useCallback, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useQuery } from '../hooks/useQuery.js'
import { useLSP } from '../hooks/useLSP.js'
import { archiveList } from '../components/archive/archive-list.js'

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
      reqParams.set('full_archives', false)

      const response = await fetch(`${state.apiUrl}/archives?${reqParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        }
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
  }, [query, state.apiUrl, state.sensitive, archiveReload])

  const onPageNav = (ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    window.scrollTo({ top: 0 })
  }

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query)
    beforeParams.set('before', before.valueOf())
    beforeParams.delete('after')
  }

  let afterParms
  if (after) {
    afterParms = new URLSearchParams(query)
    afterParms.set('after', after.valueOf())
    afterParms.delete('before')
  }

  return html`
  <div>
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParms}>later</span>` : null}
  <div>
  ${archivesLoading && !Array.isArray(archives) ? html`<div>...</div>` : null}
  ${archivesError ? html`<div>${archivesError.message}</div>` : null}
  ${Array.isArray(archives)
      ? archives.map(ar => html.for(ar, ar.id)`${archiveList({ archive: ar, reload: reloadArchives, onDelete: reloadArchives, clickForPreview: true })}`)
      : null}
  <div>
    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParms}>later</span>` : null}
  <div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
