/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useMutation } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { BookmarkEdit } from './bookmark-edit.js'
import { BookmarkView } from './bookmark-view.js'
import { diffUpdate, arraySetEqual } from '../../lib/diff-update.js'

/**
 * @typedef {object} BookmarkListProps
 * @property {TypeBookmarkReadClient} bookmark
 * @property {() => void} onInvalidate
 * @property {() => void} onDelete
 * @property {boolean} [expandSummary]
 */

/**
 * @type {FunctionComponent<BookmarkListProps>}
 */
export const BookmarkList = ({ bookmark, onInvalidate, onDelete, expandSummary }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const saveMutation = useMutation({
    mutationFn: async (/** @type {any} */ newBookmark) => {
      const payload = diffUpdate(bookmark, newBookmark, {
        tags: arraySetEqual,
        archive_urls: arraySetEqual,
      })

      const response = await fetch(`${state.apiUrl}/bookmarks/${bookmark.id}`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
      return await response.json()
    },
    onSuccess: () => {
      setEditing(false)
      onInvalidate?.()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${state.apiUrl}/bookmarks/${bookmark.id}`, {
        method: 'delete',
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setDeleted(true)
      onInvalidate?.()
      onDelete?.()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (/** @type {Record<string, unknown>} */ patch) => {
      const response = await fetch(`${state.apiUrl}/bookmarks/${bookmark.id}`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => onInvalidate?.(),
  })

  const handleToggleToRead = useCallback(() => {
    toggleMutation.mutate({ toread: !bookmark.toread })
  }, [toggleMutation, bookmark.toread])

  const handleToggleStarred = useCallback(() => {
    toggleMutation.mutate({ starred: !bookmark.starred })
  }, [toggleMutation, bookmark.starred])

  const handleToggleSensitive = useCallback(() => {
    toggleMutation.mutate({ sensitive: !bookmark.sensitive })
  }, [toggleMutation, bookmark.sensitive])

  return html`
  <div class="bc-bookmark">
    ${deleted
      ? null
      : editing
        ? tc(BookmarkEdit, {
            bookmark,
            onSave: async (/** @type {any} */ newBookmark) => { await saveMutation.mutateAsync(newBookmark) },
            onDeleteBookmark: () => deleteMutation.mutateAsync(),
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${bookmark?.id}</code>`,
          })
        : tc(BookmarkView, {
            bookmark,
            onEdit: handleEdit,
            onToggleToread: handleToggleToRead,
            onToggleStarred: handleToggleStarred,
            onToggleSensitive: handleToggleSensitive,
            expandSummary,
          })
    }
  </div>`
}
