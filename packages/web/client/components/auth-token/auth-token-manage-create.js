/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeAuthTokenCreateResponseClient } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-create-response.js'
 * @import { TypeAuthTokenUpdate } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-update.js'
 */

import { html } from 'htm/preact'
import { useRef, useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { AuthTokenEdit } from './auth-token-edit.js'

/**
 * @typedef {object} AuthTokenManageCreateFieldProps
 * @property {() => void} handleCancelEditMode
 * @property {() => void} reload
 */

/**
 * @type {FunctionComponent<AuthTokenManageCreateFieldProps>}
 */
export const ManageAuthTokenCreateField = ({ handleCancelEditMode, reload }) => {
  const state = useLSP()
  const [newToken, setNewToken] = useState(/** @type {TypeAuthTokenCreateResponseClient | null} */(null))
  const copyButton = useRef()

  const handleHideNewToken = useCallback(() => {
    setNewToken(null)
    handleCancelEditMode()
  }, [handleCancelEditMode])

  const handleCreateSave = useCallback(async (/** @type {TypeAuthTokenUpdate} */{ note, protect }) => {
    const endpoint = `${state.apiUrl}/user/auth-tokens`
    const response = await fetch(endpoint, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ note, protect }),
    })

    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json()
      setNewToken(data)
      reload()
    } else {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }, [state.apiUrl])

  const handleNewTokenSelect = useCallback(async (/** @type{MouseEvent & {currentTarget: HTMLInputElement}} */ev) => {
    ev.currentTarget?.select()
  }, [])

  const handleNewTokenCopy = useCallback(async (/** @type{MouseEvent & {currentTarget: HTMLInputElement}} */_ev) => {
    const token = newToken?.token
    const button = /** @type {HTMLButtonElement | null} */ (/** @type {unknown} */ (copyButton.current))
    try {
      if (token) {
        await navigator.clipboard.writeText(token)
        if (button) button.innerText = 'Copied'
        console.log('copied feed to clipboard')
      } else {
        throw new Error('New token not found')
      }
    } catch (e) {
      console.error(e)
      if (button) button.innerText = 'Error'
    }
  }, [newToken?.token])

  return html`
  ${newToken
      ? html`<div class="bc-token-create-copy-line">
        <input
          class="bc-token-create-copy-line-select"
          type="text"
          readonly
          onClick=${handleNewTokenSelect}
          value="${newToken.token}"
        >
        <button type="button" ref=${copyButton} onClick=${handleNewTokenCopy}>Copy</button>
        <button type="button" onClick="${handleHideNewToken}">Hide</button>
      </div>
      <div class="bc-help-text bc-token-create-copy-help-text">
        ℹ️ New auth token created. Save it in a safe place as it will never be shown again.
      </div>
      `
    : null
  }

  ${!newToken
    ? tc(AuthTokenEdit, {
              onSave: handleCreateSave,
              onCancelEdit: handleCancelEditMode,
              legend: 'Create Auth Token'
          })
    : null
  }`
}
