/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { FormError } from '#lib/htmx.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} LoginFormState
 * @property {string} redirect
 * @property {string} user
 * @property {FormError[]} errors
 */

/**
 * @typedef {ViewContext & { login: LoginFormState }} LoginPageContext
 */

/**
 * @type {FragtmlTemplate<LoginPageContext, AppLayoutName, AppFragmentId>}
 */
export const loginPage = (context) => html/* html */`
  <div class="bc-auth-page">
    <h1>Log in</h1>
    <form class="bc-auth-form" method="post" action="/login/" data-bc-passkey-login>
      ${context.login.redirect ? html`<input type="hidden" name="redirect" value="${context.login.redirect}">` : null}
      ${context.login.errors.length > 0
        ? html/* html */`
          <div class="bc-form-errors" role="alert">
            ${context.login.errors.map(error => html`<p>${error.message}</p>`)}
          </div>
        `
        : null}
      <fieldset>
        <label class="bc-field">
          <span>Email or username</span>
          <input
            minlength="1"
            maxlength="200"
            type="text"
            name="user"
            autocomplete="username webauthn"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            value="${context.login.user}"
            required
          >
        </label>
        <label class="bc-field">
          <span>Password</span>
          <input
            minlength="8"
            maxlength="255"
            type="password"
            name="password"
            autocomplete="current-password"
            required
          >
        </label>
        <div class="bc-form-actions">
          <button class="bc-button bc-button-primary" type="submit">Log in</button>
          <a href="/password_reset/">Forgot password?</a>
        </div>
      </fieldset>
      <div class="bc-form-errors" role="alert" data-bc-passkey-error hidden></div>
    </form>
  </div>
  <script type="module" src="/assets/passkey-login.js"></script>
`
