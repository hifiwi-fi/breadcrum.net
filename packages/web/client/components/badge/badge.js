/** @import { FunctionComponent, ComponentChild } from 'preact' */

import { html } from 'htm/preact'

/**
 * Badge component for displaying small status or label text
 * @type {FunctionComponent<{ children: ComponentChild }>}
 */
export const Badge = ({ children }) => {
  return html`
    <div class="bc-badge">${children}</div>
  `
}
