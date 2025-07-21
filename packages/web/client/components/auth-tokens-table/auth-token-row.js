/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { diffToken } from '../../lib/diff-auth-token.js'
import { authTokenRowEdit } from './auth-token-row-edit.js'
import { authTokenRowView } from './auth-token-row-view.js'

export const authTokenRow = Component(({ token, reload, onDelete }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (updatedToken) => {
    const payload = diffToken(token, updatedToken)

    const endpoint = `${state.apiUrl}/user/auth-tokens/${token.jti}`

    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      reload()
      setEditing(false)
    } else {
      throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
    }
  }, [token, state.apiUrl, reload, setEditing])

  const handleDelete = useCallback(async (ev) => {
    const response = await fetch(`${state.apiUrl}/user/auth-tokens/${token.jti}`, {
      method: 'DELETE',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }

    setDeleted(true)

    onDelete()
  }, [token.jti, state.apiUrl, setDeleted])

  return html`
  ${deleted
  ? html`<!-- Deleted -->`
  : editing
    ? authTokenRowEdit({
      token,
      onSave: handleSave,
      onDelete: handleDelete,
      onCancelEdit: handleCancelEdit,
    })
    : authTokenRowView({
      token,
      onEdit: handleEdit,
    })
  }`
})
