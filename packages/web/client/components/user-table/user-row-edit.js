/// <reference lib="dom" />
/* eslint-env browser */
/* eslint-disable camelcase */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 * @import { SchemaTypeAdminUserUpdateClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-update.js'
 */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'

/**
 * @typedef {object} UserRowEditProps
 * @property {SchemaTypeAdminUserReadClient} user
 * @property {(formState: SchemaTypeAdminUserUpdateClient) => Promise<void>} [onSave]
 * @property {() => Promise<void>} [onDelete]
 * @property {() => void} [onCancelEdit]
 */

/**
 * @type {FunctionComponent<UserRowEditProps>}
 */
export const UserRowEdit = ({
  user: u,
  onSave,
  onDelete,
  onCancelEdit,
}) => {
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const rowRef = useRef(/** @type {HTMLTableRowElement | null} */(null))

  const handleInitiateDelete = useCallback(() => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDelete = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      if (onDelete) await onDelete()
    } catch (err) {
      console.error(err)
      setDisabled(false)
      setDeleteConfirm(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onDelete])

  const handleSave = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const row = rowRef.current
    if (!row) return

    // goddamn forms dont work in tables.
    const username = /** @type {HTMLInputElement | null} */(row.querySelector('input[name="username"]'))?.value || ''
    const email = /** @type {HTMLInputElement | null} */(row.querySelector('input[name="email"]'))?.value || ''
    const email_confirmed = /** @type {HTMLInputElement | null} */(row.querySelector('input[name="email_confirmed"]'))?.checked || false
    const pending_email_update = /** @type {HTMLInputElement | null} */(row.querySelector('input[name="pending_email_update"]'))?.value || null
    const newsletter_subscription = /** @type {HTMLInputElement | null} */(row.querySelector('input[name="newsletter_subscription"]'))?.checked || false
    const disabled_email = /** @type {HTMLInputElement | null} */(row.querySelector('input[name="disabled_email"]'))?.checked || false
    const disabled = /** @type {HTMLInputElement | null} */(row.querySelector('input[name="disabled"]'))?.checked || false
    const disabled_reason = /** @type {HTMLTextAreaElement | null} */(row.querySelector('textarea[name="disabled_reason"]'))?.value?.trim() || null
    const internal_note = /** @type {HTMLTextAreaElement | null} */(row.querySelector('textarea[name="internal_note"]'))?.value?.trim() ?? null

    const formState = {
      username,
      email,
      email_confirmed,
      pending_email_update,
      newsletter_subscription,
      disabled_email,
      disabled,
      disabled_reason,
      internal_note,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, rowRef?.current, onSave])

  return html`
    <tr ref="${rowRef}" class="bc-user-row-edit">
        <td>
          ${onSave ? html`<button name="submit-button" onClick=${handleSave}>Save</button>` : null}
          ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
          ${onDelete
            ? deleteConfirm
              ? html`
                <button onClick=${handleCancelDelete}>Cancel</button>
                <button disabled="${disabled}" onClick=${handleDelete}>Destroy</button>`
              : html`<button onClick=${handleInitiateDelete}>Delete</button>`
            : null
          }
        </td>
        <td>${u.id}</td>
        <td>
          <input disabled="${disabled}" type="text" name="username" value="${u.username}" />
        </td>
        <td>
          <input disabled="${disabled}" type="email" name="email" value="${u.email}" />
        </td>
        <td>
          <input disabled="${disabled}" type="checkbox" name="email_confirmed" checked="${u.email_confirmed}" />
        </td>
        <td>
          <input disabled="${disabled}" type="email" name="pending_email_update" value="${u.pending_email_update}" />
        </td>
        <td>
          <input disabled="${disabled}" type="checkbox" name="newsletter_subscription" checked="${u.newsletter_subscription}" />
        </td>
        <td>
          <input disabled="${disabled}" type="checkbox" name="disabled_email" checked="${u.disabled_email}" />
        </td>
        <td>
          <input disabled="${disabled}" type="checkbox" name="disabled" checked="${u.disabled}" />
        </td>
        <td>
          <textarea disabled="${disabled}" rows="2" name="disabled_reason">${u.disabled_reason}</textarea>
        </td>
        <td>
          <textarea disabled="${disabled}" rows="2" name="internal_note">${u.internal_note}</textarea>
        </td>
        <td>
          <time datetime="${u.created_at}">
            ${(new Date(u.created_at)).toLocaleString()}
          </time>
        </td>
        <td>
          ${u.updated_at
            ? html`<time datetime="${u.updated_at}">
                    ${(new Date(u.updated_at)).toLocaleString()}
                  </time>`
            : null
          }
        </td>
      ${error ? html`<div class="error-box">${error.message}</div>` : null}
    </tr>
  `
}
