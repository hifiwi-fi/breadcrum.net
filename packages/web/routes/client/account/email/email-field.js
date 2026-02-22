/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { EmailEdit } from './email-edit.js'
import { EmailView } from './email-view.js'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 *  reload: () => void,
 * }} EmailFieldProps
 */

/**
 * @type {FunctionComponent<EmailFieldProps>}
 */
export const EmailField = ({ user, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (/** @type {{ email: string }} */{ email }) => {
    const endpoint = `${state.apiUrl}/user/email`
    const response = await fetch(endpoint, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      setEditing(false)
      reload()
    } else {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }, [state.apiUrl, setEditing, reload])

  return html`
  ${
    editing
    ? html`<${EmailEdit}
        user=${user}
        onSave=${handleSave}
        onCancelEdit=${handleCancelEdit}
      />`
    : html`<${EmailView}
        user=${user}
        onEdit=${handleEdit}
        reload=${reload}
      />`
  }
  `
}
