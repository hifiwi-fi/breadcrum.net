/* eslint-env browser */

import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'
import { formatDate, formatRelativeTime } from '../../lib/format-relative-time.js'

export const authTokenRowEdit = Component(({
  token: t,
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
    const note = row.querySelector('input[name="note"]')?.value.trim()

    const formState = {
      note
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, rowRef?.current, onSave])

  return html`
    <tr ref="${rowRef}" class=${t.is_current ? 'bc-editing bc-current-session' : 'bc-editing'}>
      <td>
        ${t.is_current
          ? html`<span class="bc-active-note">Active</span> <input ?disabled="${disabled}" type="text" name="note" value="${t.note || ''}" maxlength="255" placeholder="Add a note...">`
          : html`<input ?disabled="${disabled}" type="text" name="note" value="${t.note || ''}" maxlength="255" placeholder="Add a note...">`
        }
      </td>
      <td title=${formatDate(t.last_seen)}>
        ${formatRelativeTime(t.last_seen)}
      </td>
      <td title=${formatDate(t.created_at)}>
        ${formatRelativeTime(t.created_at)}
      </td>
      <td>
        ${t.user_agent
          ? html`<code class="bc-user-agent">${t.user_agent}</code>`
          : html`<span class="bc-muted">Unknown</span>`
        }
      </td>
      <td>
        ${t.ip
          ? html`<code>${t.ip}</code>`
          : html`<span class="bc-muted">Unknown</span>`
        }
      </td>
      <td>
        ${onSave ? html`<button name="submit-button" onclick=${handleSave}>Save</button>` : null}
        ${onCancelEdit ? html`<button onclick=${onCancelEdit}>Cancel</button>` : null}
        ${onDelete
          ? deleteConfirm
            ? html`
              <button onClick=${handleCancelDelete}>Cancel</button>
              <button ?disabled="${disabled || t.is_current}" onClick=${handleDelete}>Destroy</button>`
            : html`<button ?disabled="${t.is_current}" onClick=${handleInitiateDelete}>Delete</button>`
          : null
        }
      </td>
    </tr>
    ${error ? html`<tr><td colspan="6"><div class="error-box">${error.message}</div></td></tr>` : null}
  `
})
