/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { emailEdit } from './email-edit.js'
import { emailView } from './email-view.js'

export const emailField = Component(({ user, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async ({ email }) => {
    const endpoint = `${state.apiUrl}/user/email`
    const response = await fetch(endpoint, {
      method: 'post',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      setEditing(false)
      reload()
    } else {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }
  }, [state.apiUrl, setEditing])

  return html`
  ${
    editing
    ? emailEdit({
      user,
      onSave: handleSave,
      onCancelEdit: handleCancelEdit,
      reload
    })
    : emailView({
      user,
      onEdit: handleEdit,
      reload
    })
  }
  `
})
