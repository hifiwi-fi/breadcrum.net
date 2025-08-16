/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeAuthTokenReadClient } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js'
 * @import { TypeAuthTokenUpdate } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-update.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { AuthTokenEdit } from './auth-token-edit.js'
import { AuthTokenView } from './auth-token-view.js'
import { diffToken } from '../../lib/diff-auth-token.js'

/**
 * @typedef {object} AuthTokenListProps
 * @property {TypeAuthTokenReadClient} authToken
 * @property {() => void} [reload]
 * @property {() => void} [onDelete]
 */

/**
 * @type {FunctionComponent<AuthTokenListProps>}
 */
export const authTokenList = ({ authToken, reload, onDelete }) => {
  const state = useLSP()

  /** @type {[boolean, (editing: boolean) => void]} */
  const [editing, setEditing] = useState(false)
  /** @type {[boolean, (deleted: boolean) => void]} */
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  /**
   * @type {(newAuthToken: TypeAuthTokenUpdate) => Promise<void>}
   */
  const handleSave = useCallback(async (/** @type {TypeAuthTokenUpdate} */newAuthToken) => {
    const payload = diffToken(authToken, newAuthToken)

    const endpoint = `${state.apiUrl}/user/auth-tokens/${authToken.jti}`

    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      if (reload) reload()
      setEditing(false)
    } else {
      throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
    }
  }, [authToken.jti, state.apiUrl, reload, setEditing])

  /**
   * @type {() => Promise<void>}
   */
  const handleDeleteAuthToken = useCallback(async () => {
    await fetch(`${state.apiUrl}/user/auth-tokens/${authToken.jti}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    setDeleted(true)
    if (onDelete) onDelete()
  }, [state.apiUrl, authToken.jti, setDeleted, onDelete])

  return html`
  <div class="bc-auth-token">
    ${deleted
      ? null
      : editing
        ? tc(AuthTokenEdit, {
            authToken,
            onSave: handleSave,
            onDeleteAuthToken: handleDeleteAuthToken,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${authToken.jti}</code>`,
          })
        : tc(AuthTokenView, {
            authToken,
            onEdit: handleEdit,
          })
    }
  </div>`
}
