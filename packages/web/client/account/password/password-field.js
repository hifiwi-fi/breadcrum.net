/// <reference lib="dom" />
/* eslint-env browser */

// @ts-expect-error
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { passwordEdit } from './password-edit.js'
import { passwordView } from './password-view.js'

/**
 * @typedef {() => any} PasswordField
 */

/**
 * @type {PasswordField}
 */
export const passwordField = Component(/** @type{PasswordField} */() => {
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
    ? passwordEdit({
      onSave: handleSave,
      onCancelEdit: handleCancelEdit,
    })
    : passwordView({
      onEdit: handleEdit,
    })
  }
  `
})
