/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeUserRead } from '../api/user/schemas/schema-user-read.js'
 * @import { TypeAuthTokenReadSerialize } from '../api/user/auth-tokens/schemas/schema-auth-token-read.js'
 * @import { TypePasskeyReadSerialize } from '../api/user/passkeys/schemas/schema-passkey-read.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { AccountAuthTokenPageState, AccountPageState } from './account-page-data.js'
 */

import html from 'fragtml'

/**
 * @typedef {ViewContext & { accountPage: AccountPageState }} AccountPageContext
 */

/**
 * @type {FragtmlTemplate<AccountPageContext, AppLayoutName, AppFragmentId>}
 */
export const accountPage = (context) => html/* html */`
  <div class="bc-account-page" id="bc-account-page">
    <h1>Account</h1>
    ${context.accountPage.message ? html`<div class="bc-info-message" role="status">${context.accountPage.message}</div>` : null}
    ${context.accountPage.error ? html`<div class="bc-form-errors" role="alert"><p>${context.accountPage.error}</p></div>` : null}
    <dl class="bc-account-fields">
      ${disabledField(context.accountPage.user)}
      ${usernameField(context.accountPage.user)}
      ${emailField(context.accountPage.user)}
      ${passwordField()}
      ${newsletterField(context.accountPage.user)}
      <dt>Created at</dt>
      <dd>${dateValue(context.accountPage.user.created_at)}</dd>
      <dt>Updated at</dt>
      <dd>${dateValue(context.accountPage.user.updated_at)}</dd>
      <dt>ID</dt>
      <dd><code>${context.accountPage.user.id}</code></dd>
      ${context.accountPage.user.admin
        ? html/* html */`
          <dt>Admin section</dt>
          <dd><a href="/admin/">Admin panel</a></dd>
        `
        : null}
      ${passkeysField(context)}
      ${authTokensField(context.accountPage.authTokens)}
    </dl>
    ${passkeyRegistrationScript()}
  </div>
`

/**
 * @param {TypeUserRead} user
 * @returns {import('fragtml/types.js').HtmlRenderable | null}
 */
function disabledField (user) {
  if (!user.disabled) return null

  return html/* html */`
    <dt>Account disabled</dt>
    <dd>
      <p>Your account has been disabled${user.disabled_reason ? ' for the following reason:' : '.'}</p>
      ${user.disabled_reason ? html`<p>${user.disabled_reason}</p>` : null}
      <p>Please contact <a href="mailto:support@breadcrum.net">support@breadcrum.net</a> to resolve this issue.</p>
    </dd>
  `
}

/**
 * @param {TypeUserRead} user
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function usernameField (user) {
  return html/* html */`
    <dt>Username</dt>
    <dd id="bc-account-username">
      <div class="bc-account-field-line">
        <span>${user.username}</span>
        <details>
          <summary>Edit</summary>
          <form method="post" action="/account/username/">
            <label class="bc-field">
              <span>Username</span>
              <input pattern="^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$" minlength="1" maxlength="50" type="text" name="username" value="${user.username}" autocorrect="off" autocapitalize="off" spellcheck="false" required>
            </label>
            <button class="bc-button bc-button-primary" type="submit">Save username</button>
          </form>
        </details>
      </div>
    </dd>
  `
}

/**
 * @param {TypeUserRead} user
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function emailField (user) {
  return html/* html */`
    <dt>Email${user.email_confirmed === false ? html` <span class="bc-status-token bc-status-token-warning">Unconfirmed</span>` : null}</dt>
    <dd id="bc-account-email">
      <div class="bc-account-field-line">
        <span>${user.email}</span>
        ${user.pending_email_update ? null : emailEditDetails(user)}
      </div>
      ${user.disabled_email
        ? html`<div class="bc-help-text">This email is disabled due to delivery issues. Update to a new address or contact support.</div>`
        : null}
      ${user.email_confirmed === false && !user.pending_email_update
        ? html/* html */`
          <form method="post" action="/account/email/">
            <input type="hidden" name="action" value="resend-account">
            <button class="bc-button" type="submit">Resend email confirmation</button>
          </form>
        `
        : null}
      ${user.pending_email_update
        ? html/* html */`
          <div class="bc-account-pending-email">
            <span>${user.pending_email_update} pending verification</span>
            <form method="post" action="/account/email/">
              <input type="hidden" name="action" value="resend-update">
              <button class="bc-button" type="submit">Resend update confirmation</button>
            </form>
            <form method="post" action="/account/email/">
              <input type="hidden" name="action" value="cancel-update">
              <button class="bc-button" type="submit">Cancel email update</button>
            </form>
          </div>
        `
        : null}
    </dd>
  `
}

/**
 * @param {TypeUserRead} user
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function emailEditDetails (user) {
  return html/* html */`
    <details>
      <summary>Edit</summary>
      <form method="post" action="/account/email/">
        <input type="hidden" name="action" value="update">
        <label class="bc-field">
          <span>Email</span>
          <input minlength="1" maxlength="200" type="email" name="email" value="${user.email}" required>
        </label>
        <button class="bc-button bc-button-primary" type="submit">Save email</button>
      </form>
    </details>
  `
}

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function passwordField () {
  return html/* html */`
    <dt>Password</dt>
    <dd id="bc-account-password">
      <div class="bc-account-field-line">
        <span>**************</span>
        <details>
          <summary>Edit</summary>
          <form method="post" action="/account/password/">
            <label class="bc-field">
              <span>Password</span>
              <input type="password" minlength="8" maxlength="255" name="password" required>
            </label>
            <label class="bc-field">
              <span>Confirm password</span>
              <input type="password" minlength="8" maxlength="255" name="confirmPassword" required>
            </label>
            <button class="bc-button bc-button-primary" type="submit">Save password</button>
          </form>
        </details>
      </div>
    </dd>
  `
}

/**
 * @param {TypeUserRead} user
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function newsletterField (user) {
  return html/* html */`
    <dt>Newsletter</dt>
    <dd id="bc-account-newsletter">
      <form method="post" action="/account/newsletter/">
        <input type="hidden" name="newsletter_subscription" value="${user.newsletter_subscription ? 'false' : 'true'}">
        <span class="bc-account-field-line">
          <span>${user.newsletter_subscription ? 'Subscribed' : 'Not subscribed'}</span>
          <button class="bc-button" type="submit">${user.newsletter_subscription ? 'Unsubscribe' : 'Subscribe'}</button>
        </span>
      </form>
    </dd>
  `
}

/**
 * @param {AccountPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function passkeysField (context) {
  const passkeys = context.accountPage.passkeys
  const canAddMore = passkeys.length < 10

  return html/* html */`
    <dt>Passkeys</dt>
    <dd id="bc-account-passkeys">
      <div class="bc-account-passkeys">
        ${canAddMore
          ? html/* html */`
            <form
              class="bc-passkey-register-form"
              method="post"
              action="/account/passkeys/"
              hx-boost="false"
              data-bc-passkey-register
              data-bc-user-id="${context.user?.id ?? ''}"
              data-bc-username="${context.user?.username ?? ''}"
            >
              <input type="hidden" name="action" value="register">
              <label class="bc-field">
                <span>Name</span>
                <input type="text" name="name" maxlength="100" required autocomplete="off">
              </label>
              <button class="bc-button bc-button-primary" type="submit">Add passkey</button>
              <div class="bc-form-errors" role="alert" data-bc-passkey-register-error hidden></div>
            </form>
          `
          : html`<div class="bc-help-text">Maximum of 10 passkeys reached.</div>`}
        ${passkeys.length === 0
          ? html`<div class="bc-help-text">No passkeys registered.</div>`
          : html/* html */`
            <div class="bc-passkey-list">
              ${passkeys.map(passkeyView)}
            </div>
          `}
      </div>
    </dd>
  `
}

/**
 * @param {TypePasskeyReadSerialize} passkey
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function passkeyView (passkey) {
  return html/* html */`
    <article class="bc-passkey-row" id="bc-passkey-${passkey.id}">
      <div class="bc-passkey-heading">
        <strong>${passkey.name}</strong>
      </div>
      <dl class="bc-passkey-metadata">
        <div>
          <dt>Created</dt>
          <dd>${dateValue(passkey.created_at)}</dd>
        </div>
        <div>
          <dt>Last used</dt>
          <dd>${dateValue(passkey.last_used)}</dd>
        </div>
        <div>
          <dt>Transports</dt>
          <dd>${formatTransports(passkey.transports)}</dd>
        </div>
        <div>
          <dt>ID</dt>
          <dd><code>${passkey.id}</code></dd>
        </div>
      </dl>
      <div class="bc-passkey-actions">
        <details>
          <summary>Edit</summary>
          <form method="post" action="/account/passkeys/">
            <input type="hidden" name="action" value="update">
            <input type="hidden" name="id" value="${passkey.id}">
            <label class="bc-field">
              <span>Name</span>
              <input type="text" name="name" maxlength="100" required value="${passkey.name}">
            </label>
            <button class="bc-button" type="submit">Save passkey</button>
          </form>
        </details>
        <details>
          <summary>Delete</summary>
          <form method="post" action="/account/passkeys/">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="id" value="${passkey.id}">
            <button class="bc-button" type="submit">Delete passkey</button>
          </form>
        </details>
      </div>
    </article>
  `
}

/**
 * @param {string[] | null} transports
 * @returns {string}
 */
function formatTransports (transports) {
  return transports && transports.length > 0 ? transports.join(', ') : 'Unknown'
}

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function passkeyRegistrationScript () {
  return html`<script type="module" src="/assets/passkey-register.js"></script>`
}

/**
 * @param {AccountAuthTokenPageState} authTokens
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function authTokensField (authTokens) {
  return html/* html */`
    <dt>Auth tokens</dt>
    <dd id="bc-account-auth-tokens">
      <div class="bc-account-auth-tokens">
        <form class="bc-auth-token-create-form" method="post" action="/account/auth-tokens/">
          <input type="hidden" name="action" value="create">
          <label class="bc-field">
            <span>Note</span>
            <input type="text" name="note" maxlength="255" placeholder="Automation, CLI, work laptop">
          </label>
          <label class="bc-checkbox-field">
            <input type="checkbox" name="protect" value="true">
            <span>Protect from bulk cleanup</span>
          </label>
          <button class="bc-button bc-button-primary" type="submit">Create token</button>
        </form>
        ${authTokens.createdToken
          ? html/* html */`
            <div class="bc-auth-token-created">
              <label class="bc-field">
                <span>New token</span>
                <input type="text" readonly value="${authTokens.createdToken}">
              </label>
              <div class="bc-help-text">This token is only shown once.</div>
            </div>
          `
          : null}
        ${authTokens.data.length === 0
          ? html`<div class="bc-help-text">No auth tokens found.</div>`
          : html/* html */`
            <div class="bc-auth-token-list">
              ${authTokens.data.map(authTokenView)}
            </div>
          `}
        ${authTokenPagination(authTokens)}
      </div>
    </dd>
  `
}

/**
 * @param {TypeAuthTokenReadSerialize} token
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function authTokenView (token) {
  return html/* html */`
    <article class="bc-auth-token-row" id="bc-auth-token-${token.jti}">
      <div class="bc-auth-token-heading">
        <strong>${authTokenTitle(token)}</strong>
        <span class="bc-auth-token-badges">
          ${token.is_current ? html`<span class="bc-status-token">Current</span>` : null}
          ${token.protect ? html`<span class="bc-status-token">Protected</span>` : null}
          <span class="bc-status-token">${authTokenSource(token.source)}</span>
        </span>
      </div>
      <dl class="bc-auth-token-metadata">
        <div>
          <dt>Browser</dt>
          <dd>${userAgentSummary(token)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>${locationSummary(token)}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>${dateValue(token.last_seen)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>${dateValue(token.created_at)}</dd>
        </div>
        <div>
          <dt>JTI</dt>
          <dd><code>${token.jti}</code></dd>
        </div>
      </dl>
      <div class="bc-auth-token-actions">
        <details>
          <summary>Edit</summary>
          <form method="post" action="/account/auth-tokens/">
            <input type="hidden" name="action" value="update">
            <input type="hidden" name="jti" value="${token.jti}">
            <input type="hidden" name="protect" value="false">
            <label class="bc-field">
              <span>Note</span>
              <input type="text" name="note" maxlength="255" value="${token.note ?? ''}">
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="protect" value="true" ${token.protect ? html`checked` : null}>
              <span>Protect from bulk cleanup</span>
            </label>
            <button class="bc-button" type="submit">Save token</button>
          </form>
        </details>
        ${token.is_current
          ? html`<span class="bc-help-text">Current session tokens cannot be revoked from this page.</span>`
          : html/* html */`
            <details>
              <summary>Revoke</summary>
              <form method="post" action="/account/auth-tokens/">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="jti" value="${token.jti}">
                <button class="bc-button" type="submit">Revoke token</button>
              </form>
            </details>
          `}
      </div>
    </article>
  `
}

/**
 * @param {AccountAuthTokenPageState} authTokens
 * @returns {import('fragtml/types.js').HtmlRenderable | null}
 */
function authTokenPagination (authTokens) {
  const { pagination } = authTokens
  if (pagination.top && pagination.bottom) return null

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Auth token pagination">
      <div class="pagination-buttons-nav">
        ${pagination.after
          ? html`<a class="pagination-button" href="${accountTokenUrl(authTokens, { after: pagination.after, before: null })}">newer</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">newer</span>`}
        ${pagination.before
          ? html`<a class="pagination-button" href="${accountTokenUrl(authTokens, { before: pagination.before, after: null })}">older</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">older</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {AccountAuthTokenPageState} authTokens
 * @param {{ before?: string | null, after?: string | null }} cursor
 * @returns {string}
 */
function accountTokenUrl (authTokens, cursor) {
  const params = new URLSearchParams(authTokens.queryString)
  params.delete('message')
  params.delete('error')
  params.delete('before')
  params.delete('after')

  if (cursor.before) params.set('before', cursor.before)
  if (cursor.after) params.set('after', cursor.after)

  const queryString = params.toString()
  return queryString ? `/account/?${queryString}` : '/account/'
}

/**
 * @param {TypeAuthTokenReadSerialize} token
 * @returns {string}
 */
function authTokenTitle (token) {
  return token.note?.trim() || `${authTokenSource(token.source)} token`
}

/**
 * @param {TypeAuthTokenReadSerialize['source']} source
 * @returns {string}
 */
function authTokenSource (source) {
  if (source === 'api') return 'API'
  if (source === 'passkey') return 'Passkey'
  return 'Web'
}

/**
 * @param {TypeAuthTokenReadSerialize} token
 * @returns {string}
 */
function userAgentSummary (token) {
  const userAgent = token.user_agent
  if (!userAgent) return 'Unknown browser'

  const browser = userAgent.major && userAgent.major !== '0'
    ? `${userAgent.family} ${userAgent.major}`
    : userAgent.family
  const os = userAgent.os?.family && userAgent.os.family !== 'Other'
    ? ` on ${userAgent.os.family}`
    : ''

  return `${browser}${os}`
}

/**
 * @param {TypeAuthTokenReadSerialize} token
 * @returns {string}
 */
function locationSummary (token) {
  if (token.geoip?.city_name && token.geoip.country_name) {
    return `${token.geoip.city_name}, ${token.geoip.country_name}`
  }

  if (token.geoip?.country_name) return token.geoip.country_name
  return token.ip ?? 'Unknown location'
}

/**
 * @param {Date | string | null | undefined} value
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function dateValue (value) {
  const date = toDate(value)
  return date
    ? html`<time datetime="${date.toISOString()}">${date.toLocaleDateString()}</time>`
    : html`<span>Not set</span>`
}

/**
 * @param {Date | string | null | undefined} value
 * @returns {Date | null}
 */
function toDate (value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}
