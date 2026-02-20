/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 * @import { SchemaTypeAdminUserUpdateClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-update.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { UserRowEdit } from './user-row-edit.js'
import { UserRowView } from './user-row-view.js'
import { diffUpdate } from '../../lib/diff-update.js'
import { tc } from '../../lib/typed-component.js'

/**
 * @typedef {object} UserRowProps
 * @property {SchemaTypeAdminUserReadClient} user
 * @property {() => void} reload
 * @property {() => void} onDelete
 */

/**
 * @type {FunctionComponent<UserRowProps>}
 */
export const UserRow = ({ user, reload, onDelete }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (/** @type {SchemaTypeAdminUserUpdateClient} */newUser) => {
    const payload = diffUpdate(user, newUser)
    if (Object.keys(payload).length === 0) {
      setEditing(false)
      return
    }

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
  }, [user?.id, state.apiUrl, reload, setEditing])

  const handleDelete = useCallback(async () => {
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
  }, [state.apiUrl, user.id, setDeleted, onDelete])

  return html`
    <!-- Row -->
    ${deleted
      ? html`<!-- Deleted -->`
      : editing
        ? tc(UserRowEdit, {
            user,
            onSave: handleSave,
            onDelete: handleDelete,
            onCancelEdit: handleCancelEdit,
            apiUrl: state.apiUrl,
            reload,
          })
        : tc(UserRowView, {
            user,
            onEdit: handleEdit,
          })
    }
  `
}
