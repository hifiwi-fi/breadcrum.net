/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeAuthTokenCreateResponseClient } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-create-response.js'
 * @import { TypeAuthTokenUpdate } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-update.js'
 */

import { html } from 'htm/preact'
import { useRef, useState, useCallback, useMemo } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { AuthTokenEdit } from './auth-token-edit.js'

/**
 * @typedef {object} AuthTokenManageCreateFieldProps
 * @property {() => void} handleCancelEditMode
 */

/**
 * @type {FunctionComponent<AuthTokenManageCreateFieldProps>}
 */
export const ManageAuthTokenCreateField = ({ handleCancelEditMode }) => {
  const state = useLSP()
  const queryClient = useQueryClient()
  const authTokensQueryKeyPrefix = useMemo(() => (
    state.user?.id
      ? ['auth-tokens', state.user.id, state.apiUrl]
      : ['auth-tokens']
  ), [state.apiUrl, state.user?.id])
  const [newToken, setNewToken] = useState(/** @type {TypeAuthTokenCreateResponseClient | null} */(null))
  const copyButton = useRef()

  const handleHideNewToken = useCallback(() => {
    setNewToken(null)
    handleCancelEditMode()
  }, [handleCancelEditMode])

  const createMutation = useMutation({
    mutationFn: async (/** @type {TypeAuthTokenUpdate} */ { note, protect }) => {
      const response = await fetch(`${state.apiUrl}/user/auth-tokens`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ note, protect }),
      })
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        return response.json()
      }
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    onSuccess: (data) => {
      setNewToken(data)
      queryClient.invalidateQueries({ queryKey: authTokensQueryKeyPrefix })
    },
  })

  const handleCreateSave = useCallback(async (/** @type {TypeAuthTokenUpdate} */ update) => {
    await createMutation.mutateAsync(update)
  }, [createMutation])

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
      ? html`
        <div class="bc-token-create-copy-line">
          <input
            class="bc-token-create-copy-line-select"
            type="text"
            readonly
            onClick=${handleNewTokenSelect}
            defaultValue="${newToken.token}"
          />
          <button type="button" ref=${copyButton} onClick=${handleNewTokenCopy}>Copy</button>
          <button type="button" onClick=${handleHideNewToken}>Hide</button>
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
