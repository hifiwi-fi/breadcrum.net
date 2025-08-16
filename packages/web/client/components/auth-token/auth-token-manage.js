/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { manageAuthTokenCreateField } from './auth-token-manage-create.js'

/**
 * @typedef {'creating' | 'cleaning' | null } EditMode
 */

/**
 * @typedef {object} AuthTokenManageFieldProps
 * @property {() => void} reload
 */

/**
 * @type {FunctionComponent<AuthTokenManageFieldProps>}
 */
export const manageAuthTokenField = ({ reload }) => {
  const [editMode, setEditMode] = useState(/** @type {EditMode} */(null))

  const handleCreateMode = useCallback(() => {
    setEditMode('creating')
  }, [setEditMode])

  const handleCleanMode = useCallback(() => {
    setEditMode('cleaning')
  }, [setEditMode])

  const handleCancelEditMode = useCallback(() => {
    setEditMode(null)
  }, [setEditMode])

  return html`
  <div>
  ${editMode === 'cleaning'
    ? html`<div>Hello world</div>`
    : null
  }

  ${editMode === 'creating'
    ? html`${manageAuthTokenCreateField({ handleCancelEditMode, reload })}`
    : null
  }

  ${!editMode
    ? html`
      <button type="button" onClick="${handleCreateMode}">Create auth token</button>
      <button type="button" onClick="${handleCleanMode}">Cleanup old tokens</button>
    `
    : null
  }
  </div>
  `
}
