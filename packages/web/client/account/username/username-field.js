/// <reference lib="dom" />
/* eslint-env browser */

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { UsernameEdit } from './username-edit.js'
import { UsernameView } from './username-view.js'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 *  reload: () => void,
 * }} UsernameFieldProps
 */

/**
 * @type {FunctionComponent<UsernameFieldProps>}
 */
export const UsernameField = ({ user, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (/** @type {{ username: string }} */{ username }) => {
    const endpoint = `${state.apiUrl}/user`
    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username }),
    })

    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      console.log(await response.json())
      setEditing(false)
      reload()
    } else {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }, [user?.username, state.apiUrl, setEditing, reload])

  return html`
  ${
    editing
    ? html`<${UsernameEdit}
        user=${user}
        onSave=${handleSave}
        onCancelEdit=${handleCancelEdit}
      />`
    : html`<${UsernameView}
        user=${user}
        onEdit=${handleEdit}
      />`
  }
  `
}
