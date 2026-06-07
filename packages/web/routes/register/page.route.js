/**
 * @import { FastifyInstance, FastifyRequest } from 'fastify'
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { FormError } from '#lib/htmx.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { redirectForRequest } from '#lib/htmx.js'
import { createRouteViewContext, normalizeFrontendFlags } from '#views/context.js'

/**
 * @typedef {object} RegisterFormState
 * @property {string} email
 * @property {string} username
 * @property {boolean} newsletter_subscription
 * @property {boolean} registrationOpen
 * @property {boolean} turnstileRequired
 * @property {string} turnstileSitekey
 * @property {FormError[]} errors
 */

/**
 * @typedef {object} RegisterPageData
 * @property {ViewContext} context
 * @property {RegisterFormState} register
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<RegisterPageData | undefined>}
 */
export async function load ({ request, reply, state }) {
  const fastify = request.server
  const context = await createRegisterContext(fastify, request)

  if (context.user) {
    redirectForRequest(request, reply, '/docs/tutorial/')
    return
  }

  return {
    context,
    register: {
      ...initialRegisterState(fastify, context),
      ...(state.register ?? {}),
    },
  }
}

/**
 * @param {{ data: RegisterPageData }} ctx
 */
export default function registerPage ({ data }) {
  return html/* html */`
    <div class="bc-auth-page">
      <h1>Register</h1>
      ${data.register.registrationOpen
        ? registerForm(data.register)
        : html`<p>Registration closed. Please come back soon.</p>`}
      <div class="bc-register-terms">
        <p>
          By registering you agree to our <a href="/legal/terms/">Terms of Service</a> and
          <a href="/legal/privacy/">Privacy Policy</a>.
        </p>
      </div>
    </div>
    ${data.register.turnstileRequired
      ? html/* html */`
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
        <script type="module" src="/assets/register.js"></script>
      `
      : null}
  `
}

/**
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @returns {Promise<ViewContext>}
 */
async function createRegisterContext (fastify, request) {
  const flags = await fastify.getFlags({ frontend: true, backend: false })
  return createRouteViewContext(fastify, request, {
    title: 'Register',
    flags: normalizeFrontendFlags(flags),
  })
}

/**
 * @param {FastifyInstance} fastify
 * @param {ViewContext} context
 * @returns {RegisterFormState}
 */
function initialRegisterState (fastify, context) {
  return {
    email: '',
    username: '',
    newsletter_subscription: false,
    registrationOpen: context.flags.registration,
    turnstileRequired: fastify.config.TURNSTILE_VALIDATE,
    turnstileSitekey: fastify.config.TURNSTILE_SITEKEY ?? '',
    errors: [],
  }
}

/**
 * @param {RegisterFormState} register
 * @returns {HtmlRenderable}
 */
function registerForm (register) {
  return html/* html */`
    <form class="bc-auth-form" method="post" action="/register/">
      ${register.errors.length > 0
        ? html/* html */`
          <div class="bc-form-errors" role="alert">
            ${register.errors.map(error => html`<p>${error.message}</p>`)}
          </div>
        `
        : null}
      <fieldset>
        <label class="bc-field">
          <span>Email</span>
          <input
            minlength="1"
            maxlength="200"
            type="email"
            name="email"
            autocomplete="email"
            value="${register.email}"
            required
          >
          <span class="bc-help-text">Use a valid email address, 200 characters or fewer.</span>
        </label>
        <label class="bc-field">
          <span>Username</span>
          <input
            pattern="^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$"
            minlength="1"
            maxlength="50"
            type="text"
            name="username"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            autocomplete="username"
            value="${register.username}"
            required
          >
          <span class="bc-help-text">1-50 characters. Letters and numbers; ., _, or - between characters.</span>
        </label>
        <label class="bc-field">
          <span>Password</span>
          <input
            minlength="8"
            maxlength="255"
            type="password"
            name="password"
            autocomplete="new-password"
            required
          >
          <span class="bc-help-text">At least 8 characters, 255 or fewer.</span>
        </label>
        <label class="bc-checkbox-field">
          <input
            type="checkbox"
            name="newsletter_subscription"
            value="true"
            ${register.newsletter_subscription ? html`checked` : null}
          >
          <span>Subscribe to news and updates</span>
        </label>
        ${register.turnstileRequired
          ? html/* html */`
            <input type="hidden" name="turnstile_token" value="">
            <div class="bc-turnstile" data-bc-turnstile data-sitekey="${register.turnstileSitekey}"></div>
          `
          : null}
        <div class="bc-form-actions">
          <button class="bc-button bc-button-primary" type="submit">Register</button>
        </div>
      </fieldset>
    </form>
  `
}
