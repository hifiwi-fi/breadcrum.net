// @ts-check
/* eslint-env browser */
import { Component, html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { fetch } from 'fetch-undici'
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

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  useEffect(() => {
    const setFallbackBookmark = () => {
      setBookmark({
        url: query.get('url'),
        title: query.get('title'),
        note: query.get('description'),
        tags: query.getAll('tags')
      })
    }

    const init = async () => {
      setNewlyCreated(false)
      const queryUrl = query.get('url')

      if (!queryUrl) {
        setFallbackBookmark()
        return
      }

      const payload = {
        url: queryUrl,
        title: query.get('title'),
        note: query.get('description'),
        tags: query.getAll('tags').filter(t => Boolean(t))
      }

      const response = await fetch(`${state.apiUrl}/bookmarks`, {
        method: 'put',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json'
        }
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
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      finish()
    } else {
      throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
    }

    function finish () {
      if (query.get('jump') === 'close') {
        window.close()
      } else {
        // TODO: go to permalink?
        window.location.replace('/bookmarks')
      }
    }
  }

  return html`
    ${bookmarkEdit({
      bookmark,
      onSave: handleSaveBookmark,
      legend: existingBookmark
        ? newlyCreated
          ? html`created: <code>${bookmark?.id}</code>`
          : html`edit: <code>${bookmark?.id}</code>`
        : 'New bookmark'
    })}
  `
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
