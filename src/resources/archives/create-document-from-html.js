/**
 * @import { DOMWindow } from 'jsdom'
 */

import { JSDOM, VirtualConsole } from 'jsdom'

const STYLE_TAG_RE = /<style[^>]*>[\s\S]*?<\/style>/gi

/**
 * Create a jsdom Document from raw HTML while avoiding CSS parsing errors.
 *
 * @param {object} params
 * @param {string | null | undefined} params.html
 * @param {string | URL} params.url
 * @returns {DOMWindow['document']}
 */
export function createDocumentFromHtml ({ html, url }) {
  // Strip <style> tags to prevent CSS parsing errors with modern CSS (custom properties, etc.)
  // Readability doesn't need CSS to extract article content
  const htmlWithoutStyles = (html || '').replace(STYLE_TAG_RE, '')

  // Create a virtual console that suppresses remaining jsdom errors
  const virtualConsole = new VirtualConsole()
  virtualConsole.forwardTo(console, { jsdomErrors: 'none' })

  return (new JSDOM(htmlWithoutStyles, {
    url: url.toString(),
    virtualConsole,
  })).window.document
}
