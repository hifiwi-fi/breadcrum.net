/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { FormError } from '#lib/htmx.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} UnsubscribeFormState
 * @property {string} email
 * @property {boolean} unsubscribed
 * @property {FormError[]} errors
 */

/**
 * @typedef {ViewContext & { unsubscribe: UnsubscribeFormState }} UnsubscribePageContext
 */

/**
 * @type {FragtmlTemplate<UnsubscribePageContext, AppLayoutName, AppFragmentId>}
 */
export const unsubscribePage = (context) => html/* html */`
  <div class="bc-auth-page">
    <h1>Unsubscribe</h1>
    ${context.unsubscribe.unsubscribed
      ? html/* html */`
        <p>${context.unsubscribe.email} will no longer receive any emails from Breadcrum.</p>
        <p><a href="/account/">Go to account</a></p>
      `
      : unsubscribeForm(context)}
  </div>
`

/**
 * @param {UnsubscribePageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function unsubscribeForm (context) {
  return html/* html */`
    <form class="bc-auth-form" method="post" action="/unsubscribe/">
      ${context.unsubscribe.errors.length > 0
        ? html/* html */`
          <div class="bc-form-errors" role="alert">
            ${context.unsubscribe.errors.map(error => html`<p>${error.message}</p>`)}
          </div>
        `
        : null}
      <fieldset>
        <label class="bc-field">
          <span>Email</span>
          <input
            maxlength="200"
            type="email"
            name="email"
            autocomplete="email"
            value="${context.unsubscribe.email}"
            required
          >
        </label>
        <div class="bc-form-actions">
          <button class="bc-button bc-button-primary" type="submit">Unsubscribe</button>
        </div>
      </fieldset>
    </form>
  `
}
