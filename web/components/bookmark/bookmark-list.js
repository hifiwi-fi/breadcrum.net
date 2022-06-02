// @ts-check
/* eslint-env browser */
import { Component, html, useState } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { bookmarkEdit } from './bookmark-edit.js'
import { bookmarkView } from './bookmark-view.js'
import { diffUpdate } from '../../lib/bookmark-diff.js'

export const bookmarkList = Component(({ bookmark, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  function handleEdit () {
    setEditing(true)
  }

  function handleCancelEdit () {
    setEditing(false)
  }

  async function handleSave (newBookmark) {
    const payload = diffUpdate(bookmark, newBookmark)
    console.log({ payload, bookmark })
    const endpoint = `${state.apiUrl}/bookmarks/${bookmark.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    })
    // TODO: update dataset
    reload()
    setEditing(false)
  }

  async function handleDeleteBookmark (ev) {
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
  }

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
        : bookmarkView({ bookmark, handleEdit })
    }
  </div>`
})
