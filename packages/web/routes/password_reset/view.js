/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { FormError } from '#lib/htmx.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} PasswordResetFormState
 * @property {string} email
 * @property {boolean} sent
 * @property {FormError[]} errors
 */

/**
 * @typedef {ViewContext & { passwordReset: PasswordResetFormState }} PasswordResetPageContext
 */

/**
 * @type {FragtmlTemplate<PasswordResetPageContext, AppLayoutName, AppFragmentId>}
 */
export const passwordResetPage = (context) => html/* html */`
  <div class="bc-auth-page">
    <h1>Reset password</h1>
    ${context.passwordReset.sent
      ? html/* html */`
        <p>Email sent with password reset instructions.</p>
        <p><a href="/login/">Return to login</a></p>
      `
      : html/* html */`
        <form class="bc-auth-form" method="post" action="/password_reset/">
          ${context.passwordReset.errors.length > 0
            ? html/* html */`
              <div class="bc-form-errors" role="alert">
                ${context.passwordReset.errors.map(error => html`<p>${error.message}</p>`)}
              </div>
            `
            : null}
          <fieldset>
            <p class="bc-help-text">
              Submit your account email address and Breadcrum will send password reset instructions.
            </p>
            <label class="bc-field">
              <span>Account email</span>
              <input
                type="email"
                name="email"
                maxlength="200"
                autocomplete="email"
                value="${context.passwordReset.email}"
                required
              >
            </label>
            <div class="bc-form-actions">
              <button class="bc-button bc-button-primary" type="submit">Send reset email</button>
            </div>
          </fieldset>
        </form>
      `}
  </div>
`
