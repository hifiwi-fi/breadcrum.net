/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { AdminUsersListResult } from '../../api/admin/users/admin-user-actions.js'
 * @import { AdminUsersQueryRead } from '../../api/admin/users/get-admin-users-query.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} AdminUsersPageState
 * @property {AdminUsersQueryRead[]} users
 * @property {AdminUsersListResult['pagination'] | null} pagination
 * @property {string} queryString
 * @property {string} message
 * @property {string} error
 * @property {boolean} single
 */

/**
 * @typedef {ViewContext & { adminUsers: AdminUsersPageState }} AdminUsersContext
 */

/**
 * @type {FragtmlTemplate<AdminUsersContext, AppLayoutName, AppFragmentId>}
 */
export const adminUsersPage = (context) => html/* html */`
  <div class="bc-admin-page bc-admin-users-page">
    <h1>${context.adminUsers.single ? 'Admin user' : 'Users'}</h1>
    ${adminNav()}
    ${context.adminUsers.message ? html`<div class="bc-info-message" role="status">${context.adminUsers.message}</div>` : null}
    ${context.adminUsers.error ? html`<div class="bc-form-errors" role="alert"><p>${context.adminUsers.error}</p></div>` : null}
    ${context.adminUsers.single ? null : userSearchForm(context)}
    ${paginationControls(context)}
    ${context.adminUsers.users.length === 0
      ? html`<p class="bc-help-text">No users found.</p>`
      : html/* html */`
        <div class="bc-admin-users-list">
          ${context.adminUsers.users.map(user => userCard(user, context))}
        </div>
      `}
    ${paginationControls(context)}
  </div>
`

/**
 * @param {AdminUsersContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function userSearchForm (context) {
  const params = new URLSearchParams(context.adminUsers.queryString)
  return html/* html */`
    <form class="bc-admin-user-search" method="get" action="/admin/users/">
      <label class="bc-field">
        <span>Username</span>
        <input type="search" name="username" value="${params.get('username') ?? ''}" autocomplete="off">
      </label>
      <button class="bc-button" type="submit">Search</button>
    </form>
  `
}

/**
 * @param {AdminUsersQueryRead} user
 * @param {AdminUsersContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function userCard (user, context) {
  return html/* html */`
    <article class="bc-admin-user-card" id="admin-user-${user.id}">
      <div class="bc-admin-user-heading">
        <div>
          <h2><a href="/admin/users/view/?id=${user.id}">${user.username}</a></h2>
          <div>${user.email}</div>
          <code>${user.id}</code>
        </div>
        <div class="bc-admin-user-badges">
          ${badge(user.email_confirmed, 'Email confirmed', 'Email unconfirmed')}
          ${badge(user.newsletter_subscription, 'Newsletter', 'No newsletter')}
          ${badge(!user.disabled_email, 'Email ok', 'Email disabled')}
          ${badge(!user.disabled, 'Active', 'Disabled')}
          ${user.admin ? html`<span class="bc-status-token">Admin</span>` : null}
        </div>
      </div>
      <dl class="bc-admin-user-meta">
        <div>
          <dt>Created</dt>
          <dd>${dateValue(user.created_at)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>${dateValue(user.updated_at)}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>${dateValue(user.last_seen)}</dd>
        </div>
        <div>
          <dt>IP</dt>
          <dd><code>${user.ip ?? 'Unknown'}</code></dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>${locationSummary(user.geoip)}</dd>
        </div>
        <div>
          <dt>Registration IP</dt>
          <dd><code>${user.registration_ip ?? 'Unknown'}</code></dd>
        </div>
      </dl>
      <dl class="bc-admin-user-notes">
        <dt>Pending email</dt>
        <dd>${user.pending_email_update || 'None'}</dd>
        <dt>Disabled reason</dt>
        <dd>${user.disabled_reason || 'None'}</dd>
        <dt>Internal note</dt>
        <dd>${user.internal_note || 'None'}</dd>
      </dl>
      <details>
        <summary>Edit</summary>
        ${userEditForm(user, context)}
      </details>
    </article>
  `
}

/**
 * @param {AdminUsersQueryRead} user
 * @param {AdminUsersContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function userEditForm (user, context) {
  const redirect = context.adminUsers.single
    ? `/admin/users/view/?id=${user.id}`
    : `/admin/users/?${context.adminUsers.queryString}`

  return html/* html */`
    <form class="bc-admin-user-edit-form" method="post" action="/admin/users/">
      <input type="hidden" name="action" value="update">
      <input type="hidden" name="id" value="${user.id}">
      <input type="hidden" name="redirect" value="${redirect}">
      <div class="bc-admin-user-edit-grid">
        <label class="bc-field">
          <span>Username</span>
          <input type="text" name="username" value="${user.username}" required>
        </label>
        <label class="bc-field">
          <span>Email</span>
          <input type="email" name="email" value="${user.email}" required>
        </label>
        <label class="bc-field">
          <span>Pending email update</span>
          <input type="email" name="pending_email_update" value="${user.pending_email_update ?? ''}">
        </label>
      </div>
      <div class="bc-admin-user-flags">
        ${checkboxField('email_confirmed', 'Email confirmed', user.email_confirmed)}
        ${checkboxField('newsletter_subscription', 'Newsletter subscribed', user.newsletter_subscription)}
        ${checkboxField('disabled_email', 'Email disabled', user.disabled_email)}
        ${checkboxField('disabled', 'Account disabled', user.disabled)}
      </div>
      <label class="bc-field">
        <span>Disabled reason</span>
        <textarea name="disabled_reason" rows="3">${user.disabled_reason ?? ''}</textarea>
      </label>
      <label class="bc-field">
        <span>Internal note</span>
        <textarea name="internal_note" rows="4">${user.internal_note ?? ''}</textarea>
      </label>
      <div class="bc-form-actions">
        <button class="bc-button bc-button-primary" type="submit">Save user</button>
      </div>
    </form>
    <form class="bc-admin-user-delete-form" method="post" action="/admin/users/">
      <input type="hidden" name="action" value="delete">
      <input type="hidden" name="id" value="${user.id}">
      <input type="hidden" name="redirect" value="/admin/users/">
      <button class="bc-button" type="submit">Delete user</button>
    </form>
  `
}

/**
 * @param {string} name
 * @param {string} label
 * @param {boolean} checked
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function checkboxField (name, label, checked) {
  return html/* html */`
    <input type="hidden" name="${name}" value="false">
    <label class="bc-checkbox-field">
      <input type="checkbox" name="${name}" value="true" ${checked ? html`checked` : null}>
      <span>${label}</span>
    </label>
  `
}

/**
 * @param {AdminUsersContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable | null}
 */
function paginationControls (context) {
  const pagination = context.adminUsers.pagination
  if (!pagination || (pagination.top && pagination.bottom)) return null

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Admin users pagination">
      <div class="pagination-buttons-nav">
        ${pagination.before
          ? html`<a class="pagination-button" href="${usersUrl(context, { before: pagination.before, after: null })}">earlier</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">earlier</span>`}
        ${pagination.after
          ? html`<a class="pagination-button" href="${usersUrl(context, { after: pagination.after, before: null })}">later</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">later</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {AdminUsersContext} context
 * @param {{ before?: Date | string | null, after?: Date | string | null }} cursor
 * @returns {string}
 */
function usersUrl (context, cursor) {
  const params = new URLSearchParams(context.adminUsers.queryString)
  params.delete('message')
  params.delete('error')
  params.delete('before')
  params.delete('after')
  if (cursor.before) params.set('before', dateParam(cursor.before))
  if (cursor.after) params.set('after', dateParam(cursor.after))
  const queryString = params.toString()
  return queryString ? `/admin/users/?${queryString}` : '/admin/users/'
}

/**
 * @param {boolean} positive
 * @param {string} truthy
 * @param {string} falsey
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function badge (positive, truthy, falsey) {
  return html`<span class="${positive ? 'bc-status-token' : 'bc-status-token bc-status-token-warning'}">${positive ? truthy : falsey}</span>`
}

/**
 * @param {Date | string | null | undefined} value
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function dateValue (value) {
  if (!value) return html`<span>Never</span>`
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.valueOf())) return html`<span>Never</span>`
  return html`<time datetime="${date.toISOString()}">${date.toLocaleString()}</time>`
}

/**
 * @param {Date | string} value
 * @returns {string}
 */
function dateParam (value) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString()
}

/**
 * @param {AdminUsersQueryRead['geoip']} geoip
 * @returns {string}
 */
function locationSummary (geoip) {
  if (!geoip) return 'Unknown'
  const parts = [geoip.city_name, geoip.region_name, geoip.country_name].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Unknown'
}

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function adminNav () {
  return html/* html */`
    <nav class="bc-admin-subnav" aria-label="Admin navigation">
      <a href="/admin/">Admin</a>
      <a href="/admin/flags/">Flags</a>
      <a href="/admin/stats/">Stats</a>
      <a href="/admin/pgboss/">pg-boss</a>
    </nav>
  `
}
