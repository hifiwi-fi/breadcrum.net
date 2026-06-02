/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @type {FragtmlTemplate<ViewContext, AppLayoutName, AppFragmentId>}
 */
export const bookmarkSubmitPage = () => html/* html */`
  <div class="bc-bookmarks-submit-page">
    <div class="bc-bookmarks-submit-content">
      <h1>Submit a bookmark</h1>
      <form class="bc-quick-add-form" method="get" action="/bookmarks/add/">
        <label class="bc-quick-add-label">
          <span>URL</span>
          <input type="url" name="url" placeholder="Paste a URL to bookmark" required>
        </label>
        <button class="bc-button" type="submit">Add</button>
      </form>
    </div>
  </div>
`
