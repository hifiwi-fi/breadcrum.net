/**
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'

/**
 * @typedef {object} PasswordResetFormState
 * @property {string} email
 * @property {boolean} sent
 * @property {FormError[]} errors
 */

/**
 * @typedef {object} PasswordResetPageData
 * @property {ViewContext} context
 * @property {PasswordResetFormState} passwordReset
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<PasswordResetPageData | undefined>}
 */
export async function load ({ request, reply, state }) {
  const context = await createRouteViewContext(request.server, request, {
    title: 'Password Reset',
  })

  if (context.user) {
    redirectForRequest(request, reply, '/account/')
    return
  }

  return {
    context,
    passwordReset: state.passwordReset ?? {
      email: '',
      sent: false,
      errors: [],
    },
  }
}

/**
 * @param {{ data: PasswordResetPageData }} ctx
 */
export default function passwordResetPage ({ data }) {
  return html/* html */`
    <div class="bc-auth-page">
      <h1>Reset password</h1>
      ${data.passwordReset.sent
        ? html/* html */`
          <p>Email sent with password reset instructions.</p>
          <p><a href="/login/">Return to login</a></p>
        `
        : html/* html */`
          <form class="bc-auth-form" method="post" action="/password_reset/">
            ${data.passwordReset.errors.length > 0
              ? html/* html */`
                <div class="bc-form-errors" role="alert">
                  ${data.passwordReset.errors.map(error => html`<p>${error.message}</p>`)}
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
                  value="${data.passwordReset.email}"
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
}
