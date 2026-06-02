/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { FormError } from '#lib/htmx.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} EmailConfirmFormState
 * @property {string} token
 * @property {boolean} update
 * @property {boolean} complete
 * @property {string} email
 * @property {FormError[]} errors
 */

/**
 * @typedef {ViewContext & { emailConfirm: EmailConfirmFormState }} EmailConfirmPageContext
 */

/**
 * @type {FragtmlTemplate<EmailConfirmPageContext, AppLayoutName, AppFragmentId>}
 */
export const emailConfirmPage = (context) => html/* html */`
  <div class="bc-auth-page">
    <h1>Email confirmation</h1>
    ${context.emailConfirm.complete
      ? html/* html */`
        <p>${context.emailConfirm.update ? 'Email address successfully updated!' : 'Email address confirmed!'}</p>
        <p><a href="/account/">Go to account</a></p>
      `
      : emailConfirmForm(context)}
  </div>
`

/**
 * @param {EmailConfirmPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function emailConfirmForm (context) {
  return html/* html */`
    <form class="bc-auth-form" method="post" action="/email_confirm/">
      <input type="hidden" name="token" value="${context.emailConfirm.token}">
      <input type="hidden" name="update" value="${context.emailConfirm.update ? 'true' : 'false'}">
      ${context.emailConfirm.errors.length > 0
        ? html/* html */`
          <div class="bc-form-errors" role="alert">
            ${context.emailConfirm.errors.map(error => html`<p>${error.message}</p>`)}
          </div>
        `
        : null}
      ${context.emailConfirm.token.length === 64
        ? html/* html */`
          <fieldset>
            <p>${context.emailConfirm.update ? 'Confirm the email address update for this account.' : 'Confirm the email address for this account.'}</p>
            <div class="bc-form-actions">
              <button class="bc-button bc-button-primary" type="submit">${context.emailConfirm.update ? 'Update email' : 'Confirm email'}</button>
            </div>
          </fieldset>
        `
        : null}
    </form>
  `
}
