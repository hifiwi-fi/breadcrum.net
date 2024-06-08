/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { usernameEdit } from './username-edit.js'
import { usernameView } from './username-view.js'

export const usernameField = Component(({ user, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async ({ username }) => {
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
  }, [user?.username, state.apiUrl, setEditing])

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
