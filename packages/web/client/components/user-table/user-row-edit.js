/// <reference lib="dom" />
/* eslint-disable camelcase */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 * @import { SchemaTypeAdminUserUpdateClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-update.js'
 */

import { html } from 'htm/preact'
import { useState, useRef, useCallback, useEffect } from 'preact/hooks'
import cn from 'classnames'
import { formatUserAgent } from './format-user-agent.js'

/**
 * @typedef {object} UserRowEditProps
 * @property {SchemaTypeAdminUserReadClient} user
 * @property {(formState: SchemaTypeAdminUserUpdateClient) => Promise<void>} [onSave]
 * @property {() => Promise<void>} [onDelete]
 * @property {() => void} [onCancelEdit]
 * @property {string} [apiUrl]
 * @property {() => void} [reload]
 */

/**
 * @type {FunctionComponent<UserRowEditProps>}
 */
export const UserRowEdit = ({
  user: u,
  onSave,
  onDelete,
  onCancelEdit,
  apiUrl,
  reload,
}) => {
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef(/** @type {HTMLFormElement | null} */(null))
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [subError, setSubError] = useState(/** @type {Error | null} */(null))
  const [subLoading, setSubLoading] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [grantUnlimited, setGrantUnlimited] = useState(true)
  const [customUnlimited, setCustomUnlimited] = useState(!u.subscription_period_end)
  const viewHref = `./view/?id=${u.id}`
  const latestUserAgent = formatUserAgent(u.user_agent)
  const registrationUserAgent = formatUserAgent(u.registration_user_agent)

  useEffect(() => {
    setCustomUnlimited(!u.subscription_period_end)
  }, [u.subscription_period_end])

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

  const subFormRef = useRef(/** @type {HTMLDivElement | null} */(null))

  const handleOpenGrantForm = useCallback(() => {
    setGrantUnlimited(true)
    setSubError(null)
    setShowGrantForm(true)
  }, [])

  const handleCloseGrantForm = useCallback(() => {
    setShowGrantForm(false)
    setSubError(null)
    setGrantUnlimited(true)
  }, [])

  const handleGrantUnlimitedChange = useCallback((/** @type {Event} */ ev) => {
    const target = /** @type {HTMLInputElement} */ (ev.currentTarget)
    setGrantUnlimited(target.checked)
  }, [])

  const handleCustomUnlimitedChange = useCallback((/** @type {Event} */ ev) => {
    const target = /** @type {HTMLInputElement} */ (ev.currentTarget)
    setCustomUnlimited(target.checked)
  }, [])

  const handleGrantSubscription = useCallback(async () => {
    setSubLoading(true)
    setSubError(null)

    const container = subFormRef.current
    if (!container) return

    const displayNameEl = /** @type {HTMLInputElement | null} */ (container.querySelector('[name="sub_display_name"]'))
    const periodEndEl = /** @type {HTMLInputElement | null} */ (container.querySelector('[name="sub_period_end"]'))
    const unlimitedEl = /** @type {HTMLInputElement | null} */ (container.querySelector('[name="sub_unlimited"]'))

    const displayName = displayNameEl?.value?.trim()
    if (!displayName) {
      setSubError(new Error('Display name is required'))
      setSubLoading(false)
      return
    }

    const isUnlimited = unlimitedEl?.checked ?? false
    const periodEndValue = isUnlimited ? null : (periodEndEl?.value || null)
    if (!isUnlimited && !periodEndValue) {
      setSubError(new Error('Period end is required unless unlimited is checked'))
      setSubLoading(false)
      return
    }

    const body = {
      display_name: displayName,
      current_period_end: periodEndValue ? new Date(periodEndValue).toISOString() : null,
    }

    try {
      const response = await fetch(`${apiUrl}/admin/users/${u.id}/subscription`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }

      setShowGrantForm(false)
      if (reload) reload()
    } catch (err) {
      setSubError(/** @type {Error} */(err))
    } finally {
      setSubLoading(false)
    }
  }, [apiUrl, u.id, reload])

  const handleSyncStripe = useCallback(async () => {
    setSubLoading(true)
    setSubError(null)

    try {
      const response = await fetch(`${apiUrl}/admin/users/${u.id}/sync`, {
        method: 'post',
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }

      if (reload) reload()
    } catch (err) {
      setSubError(/** @type {Error} */(err))
    } finally {
      setSubLoading(false)
    }
  }, [apiUrl, u.id, reload])

  const handleRemoveSubscription = useCallback(async () => {
    setSubLoading(true)
    setSubError(null)

    try {
      const response = await fetch(`${apiUrl}/admin/users/${u.id}/subscription`, {
        method: 'delete',
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }

      setRemoveConfirm(false)
      if (reload) reload()
    } catch (err) {
      setSubError(/** @type {Error} */(err))
    } finally {
      setSubLoading(false)
    }
  }, [apiUrl, u.id, reload])

  const isCustomSub = u.subscription_provider === 'custom'
  const isStripeSub = u.subscription_provider === 'stripe'
  const hasSub = !!u.subscription_provider

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
              <div class="bc-user-meta-title">Subscription</div>
              <div class="bc-user-meta-grid">
                ${!hasSub
                  ? html`
                    ${showGrantForm
                      ? html`
                        <div ref=${subFormRef}>
                          <label class="bc-user-field">
                            <span class="bc-user-label">Display name</span>
                            <input type="text" name="sub_display_name" placeholder="e.g. Friends & Family, Gift" disabled=${subLoading} />
                          </label>
                          <label class="bc-user-flag">
                            <input
                              type="checkbox"
                              name="sub_unlimited"
                              checked=${grantUnlimited}
                              onChange=${handleGrantUnlimitedChange}
                              disabled=${subLoading}
                            />
                            <span>Unlimited plan (no expiration)</span>
                          </label>
                          <label class="bc-user-field">
                            <span class="bc-user-label">Period end</span>
                            <input type="date" name="sub_period_end" disabled=${subLoading || grantUnlimited} />
                          </label>
                          <div class="button-cluster">
                            <button type="button" disabled=${subLoading} onClick=${handleGrantSubscription}>Grant</button>
                            <button type="button" disabled=${subLoading} onClick=${handleCloseGrantForm}>Cancel</button>
                          </div>
                        </div>
                      `
                      : html`
                        <div class="bc-user-field">
                          <div class="bc-user-value bc-user-value-empty">No subscription (free plan)</div>
                        </div>
                        <div class="button-cluster">
                          <button type="button" onClick=${handleOpenGrantForm}>Grant subscription</button>
                        </div>
                      `
                    }
                  `
                  : null
                }
                ${isCustomSub
                  ? html`
                    <div ref=${subFormRef}>
                      <label class="bc-user-field">
                        <span class="bc-user-label">Display name</span>
                        <input type="text" name="sub_display_name" defaultValue="${u.subscription_display_name || ''}" disabled=${subLoading} />
                      </label>
                      <label class="bc-user-flag">
                        <input
                          type="checkbox"
                          name="sub_unlimited"
                          checked=${customUnlimited}
                          onChange=${handleCustomUnlimitedChange}
                          disabled=${subLoading}
                        />
                        <span>Unlimited plan (no expiration)</span>
                      </label>
                      <label class="bc-user-field">
                        <span class="bc-user-label">Period end</span>
                        <input
                          type="date"
                          name="sub_period_end"
                          defaultValue="${u.subscription_period_end ? new Date(u.subscription_period_end).toISOString().split('T')[0] : ''}"
                          disabled=${subLoading || customUnlimited}
                        />
                      </label>
                      <div class="bc-user-field">
                        <div class="bc-user-label">Status</div>
                        <div class="bc-user-value">${u.subscription_status}</div>
                      </div>
                      <div class="button-cluster">
                        <button type="button" disabled=${subLoading} onClick=${handleGrantSubscription}>Update</button>
                        ${removeConfirm
                          ? html`
                            <button type="button" onClick=${() => setRemoveConfirm(false)}>Cancel</button>
                            <button type="button" disabled=${subLoading} onClick=${handleRemoveSubscription}>Confirm remove</button>
                          `
                          : html`<button type="button" onClick=${() => setRemoveConfirm(true)}>Remove subscription</button>`
                        }
                      </div>
                    </div>
                  `
                  : null
                }
                ${isStripeSub
                  ? html`
                    <div class="bc-user-field">
                      <div class="bc-user-label">Provider</div>
                      <div class="bc-user-value">Stripe</div>
                    </div>
                    <div class="bc-user-field">
                      <div class="bc-user-label">Status</div>
                      <div class="bc-user-value">${u.subscription_status}${u.subscription_cancel_at_period_end ? ' (canceling)' : ''}</div>
                    </div>
                    <div class="bc-user-field">
                      <div class="bc-user-label">Period end</div>
                      <div class="bc-user-value">${u.subscription_period_end ? new Date(u.subscription_period_end).toLocaleString() : 'N/A'}</div>
                    </div>
                    <div class="button-cluster">
                      ${u.stripe_customer_id
                        ? html`<a href="https://dashboard.stripe.com/customers/${u.stripe_customer_id}" target="_blank" rel="noopener">Manage in Stripe</a>`
                        : null
                      }
                      <button type="button" disabled=${subLoading} onClick=${handleSyncStripe}>Sync from Stripe</button>
                    </div>
                  `
                  : null
                }
                ${!hasSub && u.stripe_customer_id
                  ? html`
                    <div class="button-cluster">
                      <button type="button" disabled=${subLoading} onClick=${handleSyncStripe}>Sync from Stripe</button>
                    </div>
                  `
                  : null
                }
                ${subError ? html`<div class="error-box">${subError.message}</div>` : null}
              </div>
            </div>
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
