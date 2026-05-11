/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeAuthTokenReadClient } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js'
 * @import { TypeAuthTokenUpdate } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-update.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback, useMemo } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { AuthTokenEdit } from './auth-token-edit.js'
import { AuthTokenView } from './auth-token-view.js'
import { diffUpdate } from '../../lib/diff-update.js'

/**
 * @typedef {object} AuthTokenListProps
 * @property {TypeAuthTokenReadClient} authToken
 */

/**
 * @type {FunctionComponent<AuthTokenListProps>}
 */
export const authTokenList = ({ authToken }) => {
  const state = useLSP()
  const queryClient = useQueryClient()
  const authTokensQueryKeyPrefix = useMemo(() => (
    state.user?.id
      ? ['auth-tokens', state.user.id, state.apiUrl]
      : ['auth-tokens']
  ), [state.apiUrl, state.user?.id])

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

  const updateMutation = useMutation({
    mutationFn: async (/** @type {TypeAuthTokenUpdate} */ newAuthToken) => {
      const payload = diffUpdate(authToken, newAuthToken)
      const response = await fetch(`${state.apiUrl}/user/auth-tokens/${authToken.jti}`, {
        method: 'put',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authTokensQueryKeyPrefix })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${state.apiUrl}/user/auth-tokens/${authToken.jti}`, {
        method: 'delete',
        headers: {
          accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setDeleted(true)
      queryClient.invalidateQueries({ queryKey: authTokensQueryKeyPrefix })
    },
  })

  /**
   * @type {(newAuthToken: TypeAuthTokenUpdate) => Promise<void>}
   */
  const handleSave = useCallback(async (/** @type {TypeAuthTokenUpdate} */ newAuthToken) => {
    await updateMutation.mutateAsync(newAuthToken)
  }, [updateMutation])

  /**
   * @type {() => Promise<void>}
   */
  const handleDeleteAuthToken = useCallback(async () => {
    await deleteMutation.mutateAsync()
  }, [deleteMutation])

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
