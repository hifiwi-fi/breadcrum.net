/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @type {FragtmlTemplate<ViewContext, AppLayoutName, AppFragmentId>}
 */
export const logoutPage = (context) => html/* html */`
  <div class="bc-auth-page">
    <h1>Log out</h1>
    ${context.user
      ? html/* html */`
        <p>Logged in as ${context.user.username}.</p>
        <form method="post" action="/logout/">
          <button class="bc-button bc-button-primary" type="submit">Log out</button>
        </form>
      `
      : html/* html */`
        <p>You are logged out.</p>
        <p><a href="/login/">Log in</a></p>
      `}
  </div>
`
