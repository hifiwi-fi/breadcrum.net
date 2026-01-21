/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { BookmarkEdit } from './bookmark-edit.js'
import { BookmarkView } from './bookmark-view.js'
import { diffUpdate, arraySetEqual } from '../../lib/diff-update.js'

/**
 * @typedef {object} BookmarkListProps
 * @property {TypeBookmarkReadClient} bookmark
 * @property {() => void} reload
 * @property {() => void} onDelete
 */

/**
 * @type {FunctionComponent<BookmarkListProps>}
 */
export const BookmarkList = ({ bookmark, reload, onDelete }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (/** @type {any} */newBookmark) => {
    const payload = diffUpdate(bookmark, newBookmark, {
      tags: arraySetEqual,
      archive_urls: arraySetEqual,
    })

    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`

    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      reload()
      setEditing(false)
    } else {
      throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
    }
  }, [bookmark.id, state.apiUrl, reload, setEditing])

  const handleDeleteBookmark = useCallback(async () => {
    await fetch(`${state.apiUrl}/bookmarks/${bookmark.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    setDeleted(true)
    onDelete()
  }, [state.apiUrl, bookmark.id, setDeleted, onDelete])

  const handleToggleToRead = useCallback(async () => {
    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        toread: !bookmark.toread,
      }),
    })

    // TODO: optimistic updates without full reload
    reload()
  }, [state.apiUrl, bookmark.id, reload, bookmark.toread])

  const handleToggleStarred = useCallback(async () => {
    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        starred: !bookmark.starred,
      }),
    })

    // TODO: optimistic updates without full reload
    reload()
  }, [state.apiUrl, bookmark.id, reload, bookmark.starred])

  const handleToggleSensitive = useCallback(async () => {
    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sensitive: !bookmark.sensitive,
      }),
    })

    // TODO: optimistic updates without full reload
    reload()
  }, [state.apiUrl, bookmark.id, reload, bookmark.sensitive])

  return html`
  <div class="bc-bookmark">
    ${deleted
      ? null
      : editing
        ? tc(BookmarkEdit, {
            bookmark,
            onSave: handleSave,
            onDeleteBookmark: handleDeleteBookmark,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${bookmark?.id}</code>`,
          })
        : tc(BookmarkView, {
            bookmark,
            onEdit: handleEdit,
            onToggleToread: handleToggleToRead,
            onToggleStarred: handleToggleStarred,
            onToggleSensitive: handleToggleSensitive,
          })
    }
  </div>`
}
