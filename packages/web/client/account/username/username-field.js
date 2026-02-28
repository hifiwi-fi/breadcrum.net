/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { UsernameEdit } from './username-edit.js'
import { UsernameView } from './username-view.js'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 * }} UsernameFieldProps
 */

/**
 * @type {FunctionComponent<UsernameFieldProps>}
 */
export const UsernameField = ({ user }) => {
  const state = useLSP()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const saveMutation = useMutation({
    mutationFn: async (/** @type {{ username: string }} */{ username }) => {
      const response = await fetch(`${state.apiUrl}/user`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
      return response.json()
    },
    onSuccess: (/** @type {TypeUserRead} */ data) => {
      setEditing(false)
      queryClient.setQueryData(['user', state.apiUrl], data)
    },
  })

  return html`
  ${
    editing
    ? html`<${UsernameEdit}
        user=${user}
        onSave=${saveMutation.mutateAsync}
        onCancelEdit=${handleCancelEdit}
      />`
    : html`<${UsernameView}
        user=${user}
        onEdit=${handleEdit}
      />`
  }
  `
}
