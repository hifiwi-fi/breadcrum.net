// @ts-check
/* eslint-env browser */
import { Component, html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { version } from '@breadcrum/bookmarklet/dist/version.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useQuery } from '../../hooks/useQuery.js'
import { bookmarkEdit } from '../../components/bookmark/bookmark-edit.js'
import { diffBookmark } from '../../lib/diff-bookmark.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const { query } = useQuery()
  const [bookmark, setBookmark] = useState(null)
  const [newlyCreated, setNewlyCreated] = useState(false)
  const [bookmarkletUpdateAvailable, setBookmarkletUpdateAvailable] = useState(false)
  const [bookmarkletVersion, setBookmarkletVersion] = useState()

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  useEffect(() => {
    // PWAs send urls as the summary (text) and not the url, in most cases :(
    const pwaTextAsUrl = Boolean(!query.get('url') && query.get('summary') && URL.canParse(query.get('summary')))

    const workingUrl = pwaTextAsUrl ? query.get('summary') : query.get('url')
    const workingSummary = pwaTextAsUrl ? undefined : query.get('summary')

    const setFallbackBookmark = () => {
      setBookmark({
        url: workingUrl,
        title: query.get('title'),
        note: query.get('note'),
        summary: workingSummary,
        tags: query.getAll('tags').filter(t => Boolean(t)),
      })
    }

    const init = async () => {
      setNewlyCreated(false)
      const ver = query.get('ver')
      setBookmarkletVersion(ver)
      if (ver !== version || query.get('description')) setBookmarkletUpdateAvailable(true)

      if (!workingUrl) {
        setFallbackBookmark()
        return
      }

      const payload = { url: workingUrl }
      if (query.get('title')) payload.title = query.get('title')
      if (query.get('note')) payload.note = query.get('note')

      if (workingSummary) payload.summary = workingSummary
      const queryTags = query.getAll('tags').filter(t => Boolean(t))
      if (queryTags.length > 0) payload.tags = queryTags

      const params = new URLSearchParams()

      const serverMeta = query.get('meta')
      if (serverMeta === 'false') params.set('meta', 'false')

      const response = await fetch(`${state.apiUrl}/bookmarks?${params.toString()}`, {
        method: 'put',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        const maybeBookmark = body?.data
        if (maybeBookmark) {
          setBookmark(maybeBookmark)
          if (response.status === 201) setNewlyCreated(true)
        } else {
          setFallbackBookmark()
        }
      } else {
        throw new Error(`${response.status} ${await response.text()}`)
      }
    }

    init().catch(err => {
      console.error(err)
      setFallbackBookmark()
    })
  }, [query, state.apiUrl])

  const existingBookmark = Boolean(bookmark?.id)

  async function handleSaveBookmark (newBookmark) {
    // Clean request for updates
    const payload = existingBookmark
      ? diffBookmark(bookmark, newBookmark)
      : newBookmark

    if (Object.keys(payload).length === 0) {
      // empty update
      finish()
    }

    const endpoint = existingBookmark
      ? `${state.apiUrl}/bookmarks/${bookmark.id}`
      : `${state.apiUrl}/bookmarks`

    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      finish(await response.json())
    } else {
      throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
    }

    function finish (responseBody) {
      const { id } = responseBody?.data ?? {}
      const redirectTarget = id ? `/bookmarks/view/?id=${id}` : '/bookmarks'
      if (query.get('jump') === 'close') {
        try {
          window.close()
        } catch (err) {
          console.error(err)
          window.location.replace(redirectTarget)
        }
      } else {
        window.location.replace(redirectTarget)
      }
    }
  }

  return html`
    ${bookmarkEdit({
      bookmark,
      bookmarkletUpdateAvailable,
      bookmarkletVersion,
      onSave: handleSaveBookmark,
      legend: existingBookmark
        ? newlyCreated
          ? html`created: <code>${bookmark?.id}</code>`
          : html`edit: <code>${bookmark?.id}</code>`
        : 'New bookmark',
    })}
  `
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
