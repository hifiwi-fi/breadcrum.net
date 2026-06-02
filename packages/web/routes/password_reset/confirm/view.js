/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { FormError } from '#lib/htmx.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} PasswordResetConfirmFormState
 * @property {string} token
 * @property {string} userId
 * @property {boolean} complete
 * @property {FormError[]} errors
 */

/**
 * @typedef {ViewContext & { passwordResetConfirm: PasswordResetConfirmFormState }} PasswordResetConfirmPageContext
 */

/**
 * @type {FragtmlTemplate<PasswordResetConfirmPageContext, AppLayoutName, AppFragmentId>}
 */
export const passwordResetConfirmPage = (context) => html/* html */`
  <div class="bc-auth-page">
    <h1>Set new password</h1>
    ${context.passwordResetConfirm.complete
      ? html/* html */`
        <p>New password set.</p>
        <p><a href="/login/">Log in</a></p>
      `
      : html/* html */`
        <form class="bc-auth-form" method="post" action="/password_reset/confirm/">
          <input type="hidden" name="token" value="${context.passwordResetConfirm.token}">
          <input type="hidden" name="userId" value="${context.passwordResetConfirm.userId}">
          ${context.passwordResetConfirm.errors.length > 0
            ? html/* html */`
              <div class="bc-form-errors" role="alert">
                ${context.passwordResetConfirm.errors.map(error => html`<p>${error.message}</p>`)}
              </div>
            `
            : null}
          <fieldset>
            <label class="bc-field">
              <span>New password</span>
              <input
                minlength="8"
                maxlength="255"
                type="password"
                name="password"
                autocomplete="new-password"
                required
              >
            </label>
            <div class="bc-form-actions">
              <button class="bc-button bc-button-primary" type="submit">Set password</button>
            </div>
          </fieldset>
        </form>
      `}
  </div>
`
