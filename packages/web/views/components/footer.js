/**
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { ViewContext } from '../context.js'
 */

import html from 'fragtml'

/**
 * @param {ViewContext} context
 * @returns {HtmlRenderable}
 */
export function footer (context) {
  return html/* html */`
    <footer class="bc-footer">
      <a href="/docs/">docs</a>
      <a href="/blog/">blog</a>
      <a href="${context.mastodonUrl}">mastodon</a>
      <a href="${context.bskyUrl}">bluesky</a>
      <span>${context.version}</span>
    </footer>
  `
}
