/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeBookmarkRead } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js';
 */

import { useEffect, useState } from 'preact/hooks'
import { useUser } from './useUser.js'
import { useQuery } from './useQuery.js'
import { useLSP } from './useLSP.js'
import { useReload } from './useReload.js'

export function useBookmarks () {
  const { user } = useUser()
  const state = useLSP()
  const { query } = useQuery()

  const [bookmarks, setBookmarks] = useState(/** @type {TypeBookmarkRead[] | null} */(null))
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [bookmarksError, setBookmarksError] = useState(/** @type {Error | null} */(null))
  const [before, setBefore] = useState(/** @type {Date | null} */(null))
  const [after, setAfter] = useState(/** @type {Date | null} */(null))

  const { reload: reloadBookmarks, signal: bookmarksReloadSignal } = useReload()

  // Load bookmarks
  useEffect(() => {
    async function getBookmarks () {
      // TODO: port SWR or use https://usehooks.com/useAsync/
      setBookmarksLoading(true)
      setBookmarksError(null)
      const pageParams = new URLSearchParams(query ?? '')

      // Transform date string to date object
      const pagePramsBefore = pageParams.get('before')
      const pageParamsAfter = pageParams.get('after')
      if (pagePramsBefore) pageParams.set('before', (new Date(+pagePramsBefore)).toISOString())
      if (pageParamsAfter) pageParams.set('after', (new Date(+pageParamsAfter)).toISOString())

      pageParams.set('sensitive', state.sensitive.toString())
      pageParams.set('toread', state.toread.toString())
      pageParams.set('starred', state.starred.toString())

      // Be selective about this
      const response = await fetch(`${state.apiUrl}/bookmarks?${pageParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setBookmarks(body?.data)
        setBefore(body?.pagination?.before ? new Date(body?.pagination?.before) : null)
        setAfter(body?.pagination?.after ? new Date(body?.pagination?.after) : null)
        if (body?.pagination?.top) {
          const newParams = new URLSearchParams(query ?? '')
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
            window?.history.replaceState(null, '', qs ? `.?${qs}` : '.')
          }
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getBookmarks()
        .then(() => { console.log('bookmarks done') })
        .catch(err => { console.error(err); setBookmarksError(err) })
        .finally(() => { setBookmarksLoading(false) })
    }
  }, [query, state.apiUrl, state.sensitive, state.starred, state.toread, bookmarksReloadSignal])

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query ?? '')
    beforeParams.set('before', String(before.valueOf()))
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query ?? '')
    afterParams.set('after', String(after.valueOf()))
    afterParams.delete('before')
  }

  return {
    bookmarksLoading,
    bookmarksError,
    bookmarks,
    reloadBookmarks,
    before,
    after,
    beforeParams,
    afterParams
  }
}
