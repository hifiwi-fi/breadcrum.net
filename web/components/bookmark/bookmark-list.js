/* eslint-env browser */
import { Component, html, useState, useRef } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { bookmarkEdit } from './bookmark-edit.js'
import { bookmarkView } from './bookmark-view.js'

export const bookmark = Component(({ bookmark }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const formRef = useRef()

  function handleEdit () {
    setEditing(true)
  }

  function handleCancelEdit () {
    setEditing(false)
  }

  async function handleSave () {
    // handle save here
    setEditing(false)
  }

  async function handleDeleteBookmark (ev) {
    const controller = new AbortController()
    const response = await fetch(`${state.apiUrl}/bookmarks/${bookmark.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json'
      },
      signal: controller.signal,
      credentials: 'include'
    })
    console.log(await response.json())
    setDeleted(true)
  }

  return html`
  <div class="bc-bookmark">
    ${deleted
      ? null
      : html`
      ${editing
        ? bookmarkEdit({
          bookmark,
          handleSave,
          formRef,
          onDeleteBookmark: handleDeleteBookmark,
          onCancelEdit: handleCancelEdit
        })
        : bookmarkView({ bookmark, handleEdit })
      }
    </div>`
    }`
})
