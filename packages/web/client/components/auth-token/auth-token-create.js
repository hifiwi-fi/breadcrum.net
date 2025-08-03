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
  /** @type {[boolean, (confirm: boolean) => void]} */
  const [editing, setEditing] = useState(false)
  /** @type {[TypeAuthTokenCreateResponseClient | null, (newToken: TypeAuthTokenCreateResponseClient | null) => void]} */
  const [newToken, setNewToken] = useState(null)
  const copyButton = useRef()
  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleHideNewToken = useCallback(() => {
    setNewToken(null)
  }, [setNewToken])

  const handleSave = useCallback(async (/** @type {{ note: string, protect: boolean  }} */{ note, protect }) => {
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
      setEditing(false)
      reload()
    } else {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }, [state.apiUrl, setEditing, setNewToken, reload])

  const handleSelect = useCallback(async (/** @type{MouseEvent & {currentTarget: HTMLInputElement}} */ev) => {
    ev.currentTarget?.select()
  })

  const handleCopy = useCallback(async (/** @type{MouseEvent & {currentTarget: HTMLInputElement}} */_ev) => {
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
  ${editing
  ? html`${authTokenEdit({ // Important this stays wrapped in html
    onSave: handleSave,
    onCancelEdit: handleCancelEdit,
    legend: 'Create Auth Token'
  })}`
  : newToken
      ? html`<div class="bc-token-create-copy-line">
        <input
          class="bc-token-create-copy-line-select"
          type="text"
          readonly
          onclick=${handleSelect}
          value="${newToken.token}"
        >
        <button ref=${copyButton} onclick=${handleCopy}>Copy</button>
        <button onclick="${handleHideNewToken}">Hide</button>
      </div>
      <div class="bc-help-text bc-token-create-copy-help-text">
        ℹ️ New auth token created. Save it in a safe place as it will never be shown again.
      </div>
      `
      : html`<button onclick="${handleEdit}">Create Auth Token +</button>`
  }`
})
