/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { userRowEdit } from './user-row-edit.js'
import { userRowView } from './user-row-view.js'
import { diffUpdate } from '../../lib/diff-update.js'

export const userRow = Component(({ user, reload, onDelete }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (newUser) => {
    const payload = diffUpdate(user, newUser)

    const endpoint = `${state.apiUrl}/admin/users/${user.id}`

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
  }, [user, state.apiUrl, reload, setEditing])

  const handleDelete = useCallback(async (ev) => {
    const response = await fetch(`${state.apiUrl}/admin/users/${user.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Error deleting user: ${body}`)
    }

    setDeleted(true)
    onDelete()
  }, [state.apiUrl, user.id, setDeleted, reload])

  return html`
    <!-- Row -->
    ${deleted
    ? html`<!-- Deleted -->`
    : editing
      ? userRowEdit({
            user,
            onSave: handleSave,
            onDelete: handleDelete,
            onCancelEdit: handleCancelEdit,
          })
      : userRowView({
            user,
            onEdit: handleEdit,
      })
    }
    `
})
