/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { PasswordEdit } from './password-edit.js'
import { PasswordView } from './password-view.js'

/**
 * @typedef {{}} PasswordFieldProps
 */

/**
 * @type {FunctionComponent<PasswordFieldProps>}
 */
export const PasswordField = () => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (/** @type {{ password: string }} */{ password }) => {
    const endpoint = `${state.apiUrl}/user`
    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })

    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      console.log(await response.json())
      setEditing(false)
    } else {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }, [state.apiUrl, setEditing])

  return html`
  ${
    editing
    ? html`<${PasswordEdit}
        onSave=${handleSave}
        onCancelEdit=${handleCancelEdit}
      />`
    : html`<${PasswordView}
        onEdit=${handleEdit}
      />`
  }
  `
}
