/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 * @import { SchemaTypeAdminUserUpdateClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-update.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { UserRowEdit } from './user-row-edit.js'
import { UserRowView } from './user-row-view.js'
import { diffUpdate } from '../../lib/diff-update.js'
import { tc } from '../../lib/typed-component.js'

/**
 * @typedef {object} UserRowProps
 * @property {SchemaTypeAdminUserReadClient} user
 * @property {() => void} [onDelete]
 */

/**
 * @type {FunctionComponent<UserRowProps>}
 */
export const UserRow = ({ user, onDelete }) => {
  const state = useLSP()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const saveMutation = useMutation({
    mutationFn: async (/** @type {SchemaTypeAdminUserUpdateClient} */newUser) => {
      const payload = diffUpdate(user, newUser)
      if (Object.keys(payload).length === 0) return

      const response = await fetch(`${state.apiUrl}/admin/users/${user.id}`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-user', user.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${state.apiUrl}/admin/users/${user.id}`, {
        method: 'delete',
        headers: { 'accept-encoding': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Error deleting user: ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setDeleted(true)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (onDelete) onDelete()
    },
  })

  return html`
    <!-- Row -->
    ${deleted
      ? html`<!-- Deleted -->`
      : editing
        ? tc(UserRowEdit, {
            user,
            onSave: saveMutation.mutateAsync,
            onDelete: deleteMutation.mutateAsync,
            onCancelEdit: handleCancelEdit,
          })
        : tc(UserRowView, {
            user,
            onEdit: handleEdit,
          })
    }
  `
}
