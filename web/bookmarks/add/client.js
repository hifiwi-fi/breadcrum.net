// @ts-check
/* eslint-env browser */
import { Component, html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { fetch } from 'fetch-undici'
import { useLSP } from '../../hooks/useLSP.js'
import { useQuery } from '../../hooks/useQuery.js'
import { bookmarkEdit } from '../../components/bookmark/bookmark-edit.js'
import { diffUpdate } from '../../lib/bookmark-diff.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const query = useQuery()
  const [bookmark, setBookmark] = useState(null)

  useEffect(() => {
    const setFallbackBookmark = () => {
      setBookmark({
        url: query.get('url'),
        title: query.get('title'),
        description: query.get('description'),
        tags: query.getAll('tags')
      })
    }

    const init = async () => {
      const queryUrl = query.get('url')
      if (!queryUrl) return setFallbackBookmark()
      const response = await fetch(`${state.apiUrl}/bookmarks?url=${queryUrl}`, {
        headers: {
          'content-type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        console.log(body)
        const maybeBookmark = body?.data?.[0]
        if (maybeBookmark) {
          setBookmark(maybeBookmark)
        } else {
          setFallbackBookmark()
        }
      } else {
        setFallbackBookmark()
      }
    }

    init().catch(err => {
      console.error(err)
      setFallbackBookmark()
    })
  }, [])

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  const existingBookmark = Boolean(bookmark?.id)

  async function handleSaveBookmark (newBookmark) {
    // Clean request for updates
    const payload = existingBookmark
      ? diffUpdate(bookmark, newBookmark)
      : newBookmark

    const endpoint = existingBookmark
      ? `${state.apiUrl}/bookmarks/${bookmark.id}`
      : `${state.apiUrl}/bookmarks`

    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    })

    if (response.ok) {
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
        ? html`edit: <code>${bookmark?.id}</code>`
        : 'New bookmark'
    })}
  `
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
