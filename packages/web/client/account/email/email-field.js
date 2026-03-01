/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { EmailEdit } from './email-edit.js'
import { EmailView } from './email-view.js'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 * }} EmailFieldProps
 */

/**
 * @type {FunctionComponent<EmailFieldProps>}
 */
export const EmailField = ({ user }) => {
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
    mutationFn: async (/** @type {{ email: string }} */{ email }) => {
      const response = await fetch(`${state.apiUrl}/user/email`, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
      return response.json()
    },
    onSuccess: () => {
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['user', state.apiUrl] })
    },
  })

  return html`
  ${
    editing
    ? html`<${EmailEdit}
        user=${user}
        onSave=${saveMutation.mutateAsync}
        onCancelEdit=${handleCancelEdit}
      />`
    : html`<${EmailView}
        user=${user}
        onEdit=${handleEdit}
      />`
  }
  `
}
