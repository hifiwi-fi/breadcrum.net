/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js'
 */
// @ts-expect-error
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { usernameEdit } from './username-edit.js'
import { usernameView } from './username-view.js'

/**
 * @typedef {({
 *  user,
 *  reload,
 * }: {
 *  user: TypeUserRead | null,
 *  reload: () => void,
 * }) => any} UsernameField
 */

/**
 * @type {UsernameField}
 */
export const usernameField = Component(/** @type{UsernameField} */({ user, reload }) => {
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
    ? usernameEdit({
      user,
      onSave: handleSave,
      onCancelEdit: handleCancelEdit,
    })
    : usernameView({
      user,
      onEdit: handleEdit,
    })
  }
  `
})
