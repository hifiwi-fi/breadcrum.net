/**
 * @import { DOMWindow } from 'jsdom'
 */

import { JSDOM, VirtualConsole } from 'jsdom'

/**
 * Create a jsdom Document without style elements for Readability.
 * This is not general-purpose HTML sanitization.
 *
 * @param {object} params
 * @param {string | null | undefined} params.html
 * @param {string | URL} params.url
 * @returns {DOMWindow['document']}
 */
export function createDocumentFromHtml ({ html, url }) {
  // Suppress jsdom errors, including CSS parsing errors raised before style removal.
  const virtualConsole = new VirtualConsole()
  virtualConsole.forwardTo(console, { jsdomErrors: 'none' })

  const document = (new JSDOM(html || '', {
    url: url.toString(),
    virtualConsole,
  })).window.document

  // Readability doesn't need CSS; remove parsed elements without rewriting HTML text.
  for (const style of document.querySelectorAll('style')) {
    style.remove()
  }

  return document
}
