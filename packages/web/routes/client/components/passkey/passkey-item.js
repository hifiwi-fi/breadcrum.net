/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypePasskeyReadClient } from '../../../api/user/passkeys/schemas/schema-passkey-read.js' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { formatRelativeTime } from '../../lib/format-relative-time.js'

/**
 * @typedef {Object} PasskeyItemProps
 * @property {TypePasskeyReadClient} passkey - Passkey to display
 * @property {(id: string, name: string) => Promise<void>} onUpdate - Callback to update passkey
 * @property {(id: string) => Promise<void>} onDelete - Callback to delete passkey
 */

/**
 * Format transports for display
 * @param {string[] | null} transports - Array of transport types
 * @returns {string} Formatted transports
 */
function formatTransports (transports) {
  if (!transports || transports.length === 0) return 'Unknown'
  return transports.join(', ')
}

/**
 * @type {FunctionComponent<PasskeyItemProps>}
 */
export const PasskeyItem = ({ passkey, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(passkey.name)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState(/** @type {Error | null} */(null))

  const handleEdit = useCallback(() => {
    setIsEditing(true)
    setEditName(passkey.name)
    setError(null)
    setShowDeleteConfirm(false)
  }, [passkey.name])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditName(passkey.name)
    setError(null)
    setShowDeleteConfirm(false)
  }, [passkey.name])

  const handleNameChange = useCallback((/** @type {Event} */ ev) => {
    const target = /** @type {HTMLInputElement} */ (ev.target)
    setEditName(target.value)
    setError(null)
  }, [])

  const handleSave = useCallback(async (/** @type {Event} */ ev) => {
    ev.preventDefault()

    if (!editName.trim()) {
      setError(new Error('Name cannot be empty'))
      return
    }

    if (editName.length > 100) {
      setError(new Error('Name must be 100 characters or less'))
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      await onUpdate(passkey.id, editName.trim())
      setIsEditing(false)
    } catch (err) {
      const error = /** @type {Error} */ (err)
      setError(error)
    } finally {
      setIsUpdating(false)
    }
  }, [passkey.id, editName, onUpdate])

  const handleInitiateDelete = useCallback(() => {
    setShowDeleteConfirm(true)
    setError(null)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await onDelete(passkey.id)
    } catch (err) {
      const error = /** @type {Error} */ (err)
      setError(error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [passkey.id, onDelete])

  // View mode
  if (!isEditing) {
    return html`
      <div class="bc-passkey-item">
        <div class="bc-passkey-name">
          ${passkey.name}
        </div>

        <div class="bc-passkey-details">
          <div class="bc-passkey-detail">
            Created: ${formatRelativeTime(passkey.created_at)}
          </div>
          <div class="bc-passkey-detail">
            Last used: ${passkey.last_used ? formatRelativeTime(passkey.last_used) : 'Never'}
          </div>
          <div class="bc-passkey-detail">
            Transports: ${formatTransports(passkey.transports)}
          </div>
        </div>

        <div class="bc-passkey-actions">
          <button type="button" onClick=${handleEdit}>Edit</button>
        </div>
      </div>
    `
  }

  // Edit mode
  return html`
    <div class="bc-passkey-item">
      <form onSubmit=${handleSave}>
        <fieldset disabled=${isUpdating || isDeleting}>
          <legend>Edit Passkey</legend>
          <div>
            <label class="block">
              Name:
              <input
                class="block"
                type="text"
                name="name"
                value=${editName}
                onInput=${handleNameChange}
                maxLength="100"
                required
              />
            </label>
            <span class="bc-help-text">
              Give your passkey a memorable name to identify it.
            </span>
          </div>

          <div class="bc-passkey-details">
            <div class="bc-passkey-detail">
              Created: ${formatRelativeTime(passkey.created_at)}
            </div>
            <div class="bc-passkey-detail">
              Last used: ${passkey.last_used ? formatRelativeTime(passkey.last_used) : 'Never'}
            </div>
            <div class="bc-passkey-detail">
              Transports: ${formatTransports(passkey.transports)}
            </div>
          </div>

          <div class="bc-passkey-edit-submit-line">
            <div class="button-cluster">
              <span><input name="submit-button" type="submit" value="Save" /></span>
              <span><button type="button" onClick=${handleCancelEdit}>Cancel</button></span>
            </div>
            <div class="button-cluster">
              ${showDeleteConfirm
                ? html`
                  <span><button type="button" onClick=${handleCancelDelete}>Cancel</button></span>
                  <span><button type="button" onClick=${handleDelete}>Destroy</button></span>
                `
                : html`
                  <span><button type="button" onClick=${handleInitiateDelete}>Delete</button></span>
                `
              }
            </div>
          </div>
          ${error ? html`<div class="error-box">${error.message}</div>` : null}
        </fieldset>
      </form>
    </div>
  `
}
