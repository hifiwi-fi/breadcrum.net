/**
 * @import { FastifyReply, FastifyRequest } from 'fastify'
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'

/**
 * @typedef {object} BookmarkSubmitPageData
 * @property {ViewContext} context
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<BookmarkSubmitPageData | undefined>}
 */
export async function load ({ request, reply }) {
  if (!request || !reply) throw new Error('Bookmark submit page requires a Fastify request')

  const context = await createRouteViewContext(request.server, request, {
    title: 'Submit Bookmark',
  })

  if (!context.user) {
    redirectAndSend(request, reply, loginRedirectForRequest(request))
    return
  }

  return { context }
}

/**
 * @returns {HtmlRenderable}
 */
export default function bookmarkSubmitPage () {
  return html/* html */`
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
}

/**
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {string} url
 * @returns {void}
 */
function redirectAndSend (request, reply, url) {
  const redirected = redirectForRequest(request, reply, url)
  if (isHtmxRequest(request)) redirected.send()
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/submit/'))
  return `/login/?redirect=${redirect}`
}
