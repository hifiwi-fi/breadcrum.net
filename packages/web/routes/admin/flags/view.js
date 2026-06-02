/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { FlagDefinitions, FlagMeta, FlagValues } from '../../api/admin/flags/flag-actions.js'
 */

import html from 'fragtml'

const noticeColorPresets = /** @type {const} */ ([
  { label: 'Default', value: '' },
  { label: 'Email warning', value: 'var(--mark-background)' },
  { label: 'Disabled', value: 'red' },
  { label: 'Muted', value: 'var(--accent-midground)' },
  { label: 'Badge neutral', value: 'var(--accent-background)' },
  { label: 'Badge success', value: 'color-mix(in oklab, var(--bc-episodes-color) 28%, var(--background))' },
  { label: 'Badge warning', value: 'color-mix(in oklab, var(--bc-warning-color) 28%, var(--background))' },
  { label: 'Badge danger', value: 'color-mix(in oklab, var(--bc-danger-color) 28%, var(--background))' },
  { label: 'Sun', value: 'color-mix(in oklab, #f59e0b 35%, var(--background))' },
  { label: 'Mint', value: 'color-mix(in oklab, #10b981 28%, var(--background))' },
  { label: 'Sky', value: 'color-mix(in oklab, #3b82f6 28%, var(--background))' },
  { label: 'Lavender', value: 'color-mix(in oklab, #8b5cf6 28%, var(--background))' },
])

/**
 * @typedef {object} AdminFlagsPageState
 * @property {FlagDefinitions} definitions
 * @property {FlagValues} values
 * @property {string} message
 * @property {string} error
 */

/**
 * @typedef {ViewContext & { adminFlags: AdminFlagsPageState }} AdminFlagsContext
 */

/**
 * @type {FragtmlTemplate<AdminFlagsContext, AppLayoutName, AppFragmentId>}
 */
export const adminFlagsPage = (context) => html/* html */`
  <div class="bc-admin-page bc-admin-flags-page">
    <h1>Admin flags</h1>
    ${adminNav()}
    ${context.adminFlags.message ? html`<div class="bc-info-message" role="status">${context.adminFlags.message}</div>` : null}
    ${context.adminFlags.error ? html`<div class="bc-form-errors" role="alert"><p>${context.adminFlags.error}</p></div>` : null}
    <form class="bc-admin-flags-form" method="post" action="/admin/flags/">
      <dl class="bc-admin-flags-list">
        ${Object.entries(context.adminFlags.definitions).map(([flag, meta]) => flagEntry(flag, meta, context.adminFlags.values[flag]))}
      </dl>
      <div class="bc-form-actions">
        <button class="bc-button bc-button-primary" type="submit">Save flags</button>
      </div>
    </form>
  </div>
`

/**
 * @param {string} flag
 * @param {FlagMeta} meta
 * @param {boolean | string | undefined} value
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function flagEntry (flag, meta, value) {
  return html/* html */`
    <dt class="bc-admin-flags-term">
      <label for="admin-flag-${flag}">${flag}</label>
    </dt>
    <dd class="bc-admin-flags-detail">
      ${meta.type === 'boolean'
        ? booleanInput(flag, value === true)
        : stringInput(flag, typeof value === 'string' ? value : meta.default)}
      <p class="bc-help-text">${meta.description}</p>
      <p class="bc-help-text">Default: <code>${String(meta.default)}</code></p>
    </dd>
  `
}

/**
 * @param {string} flag
 * @param {boolean} checked
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function booleanInput (flag, checked) {
  return html/* html */`
    <input type="hidden" name="${flag}" value="false">
    <label class="bc-checkbox-field">
      <input id="admin-flag-${flag}" type="checkbox" name="${flag}" value="true" ${checked ? html`checked` : null}>
      <span>Enabled</span>
    </label>
  `
}

/**
 * @param {string} flag
 * @param {string} value
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function stringInput (flag, value) {
  const isColorFlag = flag.endsWith('_color')
  return html/* html */`
    <label class="bc-field">
      <span>Value</span>
      <input id="admin-flag-${flag}" type="text" name="${flag}" value="${value}">
    </label>
    ${isColorFlag
      ? html/* html */`
        <div class="bc-admin-color-presets">
          ${noticeColorPresets.map(preset => html/* html */`
            <label>
              <input type="radio" name="${flag}" value="${preset.value}" ${value === preset.value ? html`checked` : null}>
              <span>${preset.label}</span>
            </label>
          `)}
        </div>
      `
      : null}
  `
}

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function adminNav () {
  return html/* html */`
    <nav class="bc-admin-subnav" aria-label="Admin navigation">
      <a href="/admin/">Admin</a>
      <a href="/admin/stats/">Stats</a>
      <a href="/admin/users/">Users</a>
      <a href="/admin/pgboss/">pg-boss</a>
    </nav>
  `
}
