/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '#routes/api/admin/users/schemas/schema-admin-user-read.js'
 * @import { SchemaTypeAdminUserUpdateClient } from '#routes/api/admin/users/schemas/schema-admin-user-update.js'
 * @import { SchemaTypeAdminUsersReadClient } from '#routes/api/admin/users/schemas/schema-admin-user-read.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback, useMemo } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '#hooks/useLSP.js'
import { UserRowEdit } from './user-row-edit.js'
import { UserRowView } from './user-row-view.js'
import { diffUpdate } from '#client/lib/diff-update.js'
import { tc } from '#client/lib/typed-component.js'

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
  const adminUsersQueryKeyPrefix = useMemo(() => (
    state.user?.id
      ? ['admin-users', state.user.id, state.apiUrl]
      : ['admin-users']
  ), [state.apiUrl, state.user?.id])
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
      if (Object.keys(payload).length === 0) return user

      const response = await fetch(`${state.apiUrl}/admin/users/${user.id}`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }

      return /** @type {SchemaTypeAdminUserReadClient} */ (await response.json())
    },
    onSuccess: updatedUser => {
      setEditing(false)
      queryClient.setQueriesData(
        { queryKey: adminUsersQueryKeyPrefix },
        (/** @type {SchemaTypeAdminUsersReadClient | undefined} */ cachedUsers) => {
          if (!cachedUsers) return cachedUsers
          return {
            ...cachedUsers,
            data: cachedUsers.data.map(cachedUser => (
              cachedUser.id === updatedUser.id ? updatedUser : cachedUser
            )),
          }
        }
      )
      queryClient.setQueriesData(
        { queryKey: ['admin-user', user.id, state.apiUrl] },
        updatedUser
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${state.apiUrl}/admin/users/${user.id}`, {
        method: 'delete',
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Error deleting user: ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setDeleted(true)
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeyPrefix })
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
            onSave: async formState => { await saveMutation.mutateAsync(formState) },
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
