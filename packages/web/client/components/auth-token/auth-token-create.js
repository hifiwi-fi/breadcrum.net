/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeAuthTokenCreateResponseClient } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-create-response.js'
 */
// @ts-expect-error
import { Component, useRef, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { authTokenEdit } from './auth-token-edit.js'

/**
 * @typedef {'creating' | 'cleaning' | null } EditMode
 */

/**
 * @typedef {({
 *  reload,
 * }: {
 *  reload: () => void,
 * }) => any} AuthTokenCreateField
 */

/**
 * @type {AuthTokenCreateField}
 */
export const newAuthTokenField = Component(/** @type{AuthTokenCreateField} */({ reload }) => {
  const state = useLSP()
  /** @type {[EditMode, (mode: EditMode) => void]} */
  const [editMode, setEditMode] = useState(false)
  /** @type {[TypeAuthTokenCreateResponseClient | null, (newToken: TypeAuthTokenCreateResponseClient | null) => void]} */
  const [newToken, setNewToken] = useState(null)
  const copyButton = useRef()

  const handleCreateMode = useCallback(() => {
    setEditMode('creating')
  }, [setEditMode])

  const handleCleanMode = useCallback(() => {
    setEditMode('cleaning')
  }, [setEditMode])

  const handleCancelEditMode = useCallback(() => {
    setEditMode(null)
  }, [setEditMode])

  const handleHideNewToken = useCallback(() => {
    setNewToken(null)
    setEditMode(null)
  }, [setNewToken])

  const handleCreateSave = useCallback(async (/** @type {{ note: string, protect: boolean  }} */{ note, protect }) => {
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
  }, [state.apiUrl, setEditMode, setNewToken, reload])

  const handleNewTokenSelect = useCallback(async (/** @type{MouseEvent & {currentTarget: HTMLInputElement}} */ev) => {
    ev.currentTarget?.select()
  })

  const handleNewTokenCopy = useCallback(async (/** @type{MouseEvent & {currentTarget: HTMLInputElement}} */_ev) => {
    const token = newToken?.token
    try {
      if (token) {
        await navigator.clipboard.writeText(token)
        copyButton.current.innerText = 'Copied'
        console.log('copied feed to clipboard')
      } else {
        throw new Error('New token not found')
      }
    } catch (e) {
      console.error(e)
      copyButton.current.innerText = 'Error'
    }
  }, [copyButton.current, newToken?.token])

  return html`
  ${editMode === 'creating'
    ? newToken
      ? html`<div class="bc-token-create-copy-line">
        <input
          class="bc-token-create-copy-line-select"
          type="text"
          readonly
          onclick=${handleNewTokenSelect}
          value="${newToken.token}"
        >
        <button ref=${copyButton} onclick=${handleNewTokenCopy}>Copy</button>
        <button onclick="${handleHideNewToken}">Hide</button>
      </div>
      <div class="bc-help-text bc-token-create-copy-help-text">
        ℹ️ New auth token created. Save it in a safe place as it will never be shown again.
      </div>
      `
      : html`
          ${authTokenEdit({ // Important this stays wrapped in html
              onSave: handleCreateSave,
              onCancelEdit: handleCancelEditMode,
              legend: 'Create Auth Token'
          })}`
  : editMode === 'cleaning'
    ? html``
    : html`
        <button onclick="${handleCreateMode}">Create auth token</button>
        <button onclick="${handleCleanMode}">Cleanup old tokens</button>
      `
  }`
})
