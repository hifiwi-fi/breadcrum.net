/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { bookmarkEdit } from './bookmark-edit.js'
import { bookmarkView } from './bookmark-view.js'
import { diffBookmark } from '../../lib/diff-bookmark.js'

export const bookmarkList = Component(({ bookmark, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (newBookmark) => {
    const payload = diffBookmark(bookmark, newBookmark)

    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    })

    reload()
    setEditing(false)
  }, [bookmark, state.apiUrl, reload, setEditing])

  const handleDeleteBookmark = useCallback(async (ev) => {
    const response = await fetch(`${state.apiUrl}/bookmarks/${bookmark.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json'
      },
      credentials: 'include'
    })
    console.log({ json: await response.json(), foo: 'bar' })
    setDeleted(true)
    reload()
  }, [state.apiUrl, bookmark.id, setDeleted, reload])

  const handleToggleToRead = useCallback(async (ev) => {
    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        toread: !bookmark.toread
      }),
      credentials: 'include'
    })

    // TODO: optimistic updates without full reload
    reload()
  }, [state.apiUrl, bookmark.id, reload, bookmark.toread])

  const handleToggleStarred = useCallback(async (ev) => {
    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        starred: !bookmark.starred
      }),
      credentials: 'include'
    })

    // TODO: optimistic updates without full reload
    reload()
  }, [state.apiUrl, bookmark.id, reload, bookmark.starred])

  const handleToggleSensitive = useCallback(async (ev) => {
    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sensitive: !bookmark.sensitive
      }),
      credentials: 'include'
    })

    // TODO: optimistic updates without full reload
    reload()
  }, [state.apiUrl, bookmark.id, reload, bookmark.sensitive])

  return html`
  <div class="bc-bookmark">
    ${deleted
      ? null
      : editing
        ? bookmarkEdit({
            bookmark,
            onSave: handleSave,
            onDeleteBookmark: handleDeleteBookmark,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${bookmark?.id}</code>`
          })
        : bookmarkView({
            bookmark,
            onEdit: handleEdit,
            onToggleToread: handleToggleToRead,
            onToggleStarred: handleToggleStarred,
            onToggleSensitive: handleToggleSensitive
          })
    }
  </div>`
})
