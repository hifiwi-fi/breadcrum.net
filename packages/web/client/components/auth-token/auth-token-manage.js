/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeAuthTokenCreateResponseClient } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-create-response.js'
 */
// @ts-expect-error
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { manageAuthTokenCreateField } from './auth-token-manage-create.js'

/**
 * @typedef {'creating' | 'cleaning' | null } EditMode
 */

/**
 * @typedef {({
 *  reload,
 * }: {
 *  reload: () => void,
 * }) => any} AuthTokenManageField
 */

/**
 * @type {AuthTokenManageField}
 */
export const manageAuthTokenField = Component(/** @type{AuthTokenManageField} */({ reload }) => {
  /** @type {[EditMode, (mode: EditMode) => void]} */
  const [editMode, setEditMode] = useState(null)
  /** @type {[TypeAuthTokenCreateResponseClient | null, (newToken: TypeAuthTokenCreateResponseClient | null) => void]} */

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
      <button type="button" onclick="${handleCreateMode}">Create auth token</button>
      <button type="button" onclick="${handleCleanMode}">Cleanup old tokens</button>
    `
    : null
  }
  </div>
  `
})
