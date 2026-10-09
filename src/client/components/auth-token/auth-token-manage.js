/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { tc } from '../../lib/typed-component.js'
import { ManageAuthTokenCreateField } from './auth-token-manage-create.js'

/**
 * Cleaning is a TODO
 * @typedef {'creating' | 'cleaning' | null } EditMode
 */

/**
 * @typedef {object} AuthTokenManageFieldProps
 * @property {() => void} reload
 */

/**
 * @type {FunctionComponent<AuthTokenManageFieldProps>}
 */
export const ManageAuthTokenField = ({ reload }) => {
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
  <div class='auth-token-manage'>
    ${editMode === 'creating'
      ? tc(ManageAuthTokenCreateField, {
          handleCancelEditMode,
          reload
        })
      : null
    }

    ${!editMode
      ? html`
        <div class='button-gap'>
          <button type="button" onClick="${handleCreateMode}">Create auth token</button>
          <!-- <button type="button" onClick="${handleCleanMode}">Cleanup old tokens</button> -->
        </div>
      `
      : null
    }
  </div>
  `
}
