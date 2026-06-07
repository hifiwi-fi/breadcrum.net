/**
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'

/**
 * @typedef {object} LoginFormState
 * @property {string} redirect
 * @property {string} user
 * @property {FormError[]} errors
 */

/**
 * @typedef {object} LoginPageData
 * @property {ViewContext} context
 * @property {LoginFormState} login
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<LoginPageData | undefined>}
 */
export async function load ({ request, reply, state }) {
  const redirect = redirectFromRequest(request, '')
  const context = await createRouteViewContext(request.server, request, {
    title: 'Login',
  })

  if (context.user) {
    redirectForRequest(request, reply, redirect || '/bookmarks/')
    return
  }

  return {
    context,
    login: state.login ?? {
      redirect,
      user: '',
      errors: [],
    },
  }
}

/**
 * @param {{ data: LoginPageData }} ctx
 */
export default function loginPage ({ data }) {
  return html/* html */`
    <div class="bc-auth-page">
      <h1>Log in</h1>
      <form class="bc-auth-form" method="post" action="/login/" data-bc-passkey-login>
        ${data.login.redirect ? html`<input type="hidden" name="redirect" value="${data.login.redirect}">` : null}
        ${data.login.errors.length > 0
          ? html/* html */`
            <div class="bc-form-errors" role="alert">
              ${data.login.errors.map(error => html`<p>${error.message}</p>`)}
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
              value="${data.login.user}"
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
}

/**
 * @param {FastifyRequest} request
 * @param {string} fallback
 * @returns {string}
 */
function redirectFromRequest (request, fallback) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  return safeRedirectPath(url.searchParams.get('redirect'), fallback)
}
