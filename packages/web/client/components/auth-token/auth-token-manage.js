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
 * @property {boolean} [disabled]
 */

/**
 * @type {FunctionComponent<AuthTokenManageFieldProps>}
 */
export const ManageAuthTokenField = ({ disabled = false }) => {
  const [editMode, setEditMode] = useState(/** @type {EditMode} */(null))

  const handleCreateMode = useCallback(() => {
    if (disabled) return
    setEditMode('creating')
  }, [disabled, setEditMode])

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
            disabled,
          })
      : null
    }

    ${!editMode
      ? html`
        <div class='button-gap'>
            <button type="button" onClick=${handleCreateMode} disabled=${disabled}>Create auth token</button>
          <!-- <button type="button" onClick="${handleCleanMode}">Cleanup old tokens</button> -->
        </div>
      `
      : null
    }
  </div>
  `
}
