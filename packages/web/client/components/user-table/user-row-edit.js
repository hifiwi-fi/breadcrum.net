/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'

export const userRowEdit = Component(({
  user: u,
  onSave,
  onDelete,
  onCancelEdit,
}) => {
  const [error, setError] = useState(null)

  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [disabled, setDisabled] = useState(false)

  const rowRef = useRef()

  const handleInitiateDelete = useCallback((ev) => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const handleCancelDelete = useCallback((ev) => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDelete = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      await onDelete()
    } catch (err) {
      console.error(err)
      setDisabled(false)
      setDeleteConfirm(false)
      setError(err)
    }
  }, [setDisabled, setError, onDelete])

  const handleSave = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const row = rowRef.current

    // goddamn forms dont work in tables.
    const username = row.querySelector('input[name="username"]')?.value
    const email = row.querySelector('input[name="email"]')?.value
    const email_confirmed = row.querySelector('input[name="email_confirmed"]')?.checked
    const pending_email_update = row.querySelector('input[name="pending_email_update"]')?.value
    const newsletter_subscription = row.querySelector('input[name="newsletter_subscription"]')?.checked
    const disabled_email = row.querySelector('input[name="disabled_email"]')?.checked
    const disabled = row.querySelector('input[name="disabled"]')?.checked
    const disabled_reason = row.querySelector('textarea[name="disabled_reason"]')?.value?.trim()
    const internal_note = row.querySelector('textarea[name="internal_note"]')?.value?.trim()

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
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, rowRef?.current, onSave])

  return html`
    <tr ref="${rowRef}" class="bc-user-row-edit">
        <td>
          ${onSave ? html`<button name="submit-button" onclick=${handleSave}>Save</button>` : null}
          ${onCancelEdit ? html`<button onclick=${onCancelEdit}>Cancel</button>` : null}
          ${onDelete
            ? deleteConfirm
              ? html`
                <button onClick=${handleCancelDelete}>Cancel</button>
                <button ?disabled="${disabled}" onClick=${handleDelete}>Destroy</button>`
              : html`<button onClick=${handleInitiateDelete}>Delete</button>`
            : null
          }
        </td>
        <td>${u.id}</td>
        <td>
          <input ?disabled="${disabled}" type="text" name="username" value="${u.username}">
        </td>
        <td>
          <input ?disabled="${disabled}" type="email" name="email" value="${u.email}">
        </td>
        <td>
          <input ?disabled="${disabled}" type="checkbox" name="email_confirmed" ?checked="${u.email_confirmed}">
        </td>
        <td>
          <input ?disabled="${disabled}" type="email" name="pending_email_update" value="${u.pending_email_update}">
        </td>
        <td>
          <input ?disabled="${disabled}" type="checkbox" name="newsletter_subscription" ?checked="${u.newsletter_subscription}">
        </td>
        <td>
          <input ?disabled="${disabled}" type="checkbox" name="disabled_email" ?checked="${u.disabled_email}">
        </td>
        <td>
          <input ?disabled="${disabled}" type="checkbox" name="disabled" ?checked="${u.disabled}">
        </td>
        <td>
          <textarea ?disabled="${disabled}" rows="2" name="disabled_reason">${u.disabled_reason}</textarea>
        </td>
        <td>
          <textarea ?disabled="${disabled}" rows="2" name="internal_note">${u.internal_note}</textarea>
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
})
