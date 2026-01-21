/// <reference lib="dom" />
/* eslint-disable camelcase */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 * @import { SchemaTypeAdminUserUpdateClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-update.js'
 */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'
import cn from 'classnames'
import { formatUserAgent } from './format-user-agent.js'

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
  const formRef = useRef(/** @type {HTMLFormElement | null} */(null))
  const viewHref = `./view/?id=${u.id}`
  const latestUserAgent = formatUserAgent(u.user_agent)
  const registrationUserAgent = formatUserAgent(u.registration_user_agent)

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

    const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
    if (!form) return

    const usernameElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('username'))
    if (!usernameElement) return
    const emailElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('email'))
    if (!emailElement) return
    const emailConfirmedElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('email_confirmed'))
    if (!emailConfirmedElement) return
    const pendingEmailUpdateElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('pending_email_update'))
    if (!pendingEmailUpdateElement) return
    const newsletterSubscriptionElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('newsletter_subscription'))
    if (!newsletterSubscriptionElement) return
    const disabledEmailElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('disabled_email'))
    if (!disabledEmailElement) return
    const disabledElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('disabled'))
    if (!disabledElement) return
    const disabledReasonElement = /** @type {HTMLTextAreaElement | null} */ (form.elements.namedItem('disabled_reason'))
    if (!disabledReasonElement) return
    const internalNoteElement = /** @type {HTMLTextAreaElement | null} */ (form.elements.namedItem('internal_note'))
    if (!internalNoteElement) return

    const username = usernameElement.value || ''
    const email = emailElement.value || ''
    const email_confirmed = emailConfirmedElement.checked
    const pending_email_update = pendingEmailUpdateElement.value || null
    const newsletter_subscription = newsletterSubscriptionElement.checked
    const disabled_email = disabledEmailElement.checked
    const disabled = disabledElement.checked
    const disabled_reason = disabledReasonElement.value?.trim() || null
    const internal_note = internalNoteElement.value?.trim() ?? null

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
  }, [setDisabled, setError, formRef?.current, onSave])

  return html`
    <article class="bc-user-card bc-user-card-edit" role="listitem">
      <form ref=${formRef} class="bc-user-edit-form" onsubmit=${handleSave}>
        <fieldset disabled=${disabled}>
          <div class="bc-user-card-header">
            <div class="bc-user-heading">
              <div class="bc-user-edit-title">Editing ${u.username}</div>
              <div class="bc-user-id-line">
                <span class="bc-user-label">ID</span>
                <a class="bc-user-id-link" href="${viewHref}">
                  <code class="bc-user-id">${u.id}</code>
                </a>
              </div>
            </div>
            <div class="bc-user-edit-actions">
              <div class="button-cluster">
                ${onSave ? html`<button type="submit" name="submit-button">Save</button>` : null}
                ${onCancelEdit ? html`<button type="button" onClick=${onCancelEdit}>Cancel</button>` : null}
              </div>
              <div class="button-cluster">
                ${onDelete
                  ? deleteConfirm
                    ? html`
                      <button type="button" onClick=${handleCancelDelete}>Cancel</button>
                      <button type="button" disabled=${disabled} onClick=${handleDelete}>Destroy</button>`
                    : html`<button type="button" onClick=${handleInitiateDelete}>Delete</button>`
                  : null
                }
              </div>
            </div>
          </div>

          <div class="bc-user-edit-grid">
            <label class="bc-user-field">
              <span class="bc-user-label">Username</span>
              <input type="text" name="username" defaultValue="${u.username}" />
            </label>
            <label class="bc-user-field">
              <span class="bc-user-label">Email</span>
              <input type="email" name="email" defaultValue="${u.email}" />
            </label>
            <label class="bc-user-field">
              <span class="bc-user-label">Pending email update</span>
              <input type="email" name="pending_email_update" defaultValue="${u.pending_email_update || ''}" />
            </label>
          </div>

          <div class="bc-user-edit-flags">
            <label class="bc-user-flag">
              <input type="checkbox" name="email_confirmed" checked="${u.email_confirmed}" />
              <span>Email confirmed</span>
            </label>
            <label class="bc-user-flag">
              <input type="checkbox" name="newsletter_subscription" checked="${u.newsletter_subscription}" />
              <span>Newsletter subscribed</span>
            </label>
            <label class="bc-user-flag">
              <input type="checkbox" name="disabled_email" checked="${u.disabled_email}" />
              <span>Email disabled</span>
            </label>
            <label class="bc-user-flag">
              <input type="checkbox" name="disabled" checked="${u.disabled}" />
              <span>Account disabled</span>
            </label>
          </div>

          <div class="bc-user-edit-notes">
            <label class="bc-user-field">
              <span class="bc-user-label">Disabled reason</span>
              <textarea rows="3" name="disabled_reason">${u.disabled_reason || ''}</textarea>
            </label>
            <label class="bc-user-field">
              <span class="bc-user-label">Internal note</span>
              <textarea rows="4" name="internal_note">${u.internal_note || ''}</textarea>
            </label>
          </div>

          <div class="bc-user-meta">
            <div class="bc-user-meta-section">
              <div class="bc-user-meta-title">Activity</div>
              <div class="bc-user-meta-grid">
                <div class="bc-user-field">
                  <div class="bc-user-label">Last seen</div>
                  ${u.last_seen
                    ? html`<time class="bc-user-value" datetime="${u.last_seen}">
                            ${(new Date(u.last_seen)).toLocaleString()}
                          </time>`
                    : html`<div class="bc-user-value bc-user-value-empty">Never</div>`
                  }
                </div>
                <div class="bc-user-field">
                  <div class="bc-user-label">Created</div>
                  <time class="bc-user-value" datetime="${u.created_at}">
                    ${(new Date(u.created_at)).toLocaleString()}
                  </time>
                </div>
                <div class="bc-user-field">
                  <div class="bc-user-label">Updated</div>
                  ${u.updated_at
                    ? html`<time class="bc-user-value" datetime="${u.updated_at}">
                            ${(new Date(u.updated_at)).toLocaleString()}
                          </time>`
                    : html`<div class="bc-user-value bc-user-value-empty">Never</div>`
                  }
                </div>
              </div>
            </div>
            <div class="bc-user-meta-section">
              <div class="bc-user-meta-title">Client</div>
              <div class="bc-user-meta-grid">
                <div class="bc-user-field">
                  <div class="bc-user-label">IP</div>
                  <code class="${cn({
                    'bc-user-value': true,
                    'bc-user-value-mono': true,
                    'bc-user-value-empty': !u.ip,
                  })}">
                    ${u.ip || 'Unknown'}
                  </code>
                </div>
                <div class="bc-user-field">
                  <div class="bc-user-label">User agent</div>
                  <div class="${cn({
                    'bc-user-value': true,
                    'bc-user-value-empty': !u.user_agent,
                  })}">
                    ${latestUserAgent}
                  </div>
                </div>
                <div class="bc-user-field">
                  <div class="bc-user-label">Registration IP</div>
                  <code class="${cn({
                    'bc-user-value': true,
                    'bc-user-value-mono': true,
                    'bc-user-value-empty': !u.registration_ip,
                  })}">
                    ${u.registration_ip || 'Unknown'}
                  </code>
                </div>
                <div class="bc-user-field">
                  <div class="bc-user-label">Registration user agent</div>
                  <div class="${cn({
                    'bc-user-value': true,
                    'bc-user-value-empty': !u.registration_user_agent,
                  })}">
                    ${registrationUserAgent}
                  </div>
                </div>
              </div>
            </div>
          </div>

          ${error ? html`<div class="error-box">${error.message}</div>` : null}
        </fieldset>
      </form>
    </article>
  `
}
