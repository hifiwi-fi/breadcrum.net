/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeAuthTokenRead } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
 */

// @ts-expect-error
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { authTokensEdit } from './auth-tokens-edit.js'
import { authTokensView } from './auth-tokens-view.js'
import { diffBookmark } from '../../lib/diff-bookmark.js'
import { diffToken } from '../../lib/diff-auth-token.js'

/**
 * @typedef {({
 *  authToken,
 *  reload,
 *  onDelete
 * }: {
 *  authToken: TypeAuthTokenRead | null,
 *  reload?: () => void,
 *  onDelete?: () => void,
 * }) => any} AuthTokenList
 */

 /**
  * @type {AuthTokenList}
  */
export const bookmarkList = Component((/** @type{AuthTokenList} */({ authToken, reload, onDelete }) => {
  const state = useLSP()

  /** @type {[boolean, (editing: boolean) => void]} */
  const [editing, setEditing] = useState(false)
  /** @type {[boolean, (deleted: boolean) => void]} */
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (newAuthToken) => {
    const payload = diffToken(authToken, newAuthToken)

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
  }, [bookmark, state.apiUrl, reload, setEditing])

  const handleDeleteBookmark = useCallback(async (ev) => {
    await fetch(`${state.apiUrl}/bookmarks/${bookmark.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    setDeleted(true)
    onDelete()
  }, [state.apiUrl, bookmark.id, setDeleted, reload])

  const handleToggleToRead = useCallback(async (ev) => {
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

  const handleToggleStarred = useCallback(async (ev) => {
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

  const handleToggleSensitive = useCallback(async (ev) => {
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
        ? bookmarkEdit({
            bookmark,
            onSave: handleSave,
            onDeleteBookmark: handleDeleteBookmark,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${bookmark?.id}</code>`,
          })
        : bookmarkView({
            bookmark,
            onEdit: handleEdit,
            onToggleToread: handleToggleToRead,
            onToggleStarred: handleToggleStarred,
            onToggleSensitive: handleToggleSensitive,
          })
    }
  </div>`
})
