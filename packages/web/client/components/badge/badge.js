/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'

/**
 * Badge component for displaying small status or label text
 * @type {FunctionComponent<{ text: string }>}
 */
export const Badge = ({ text }) => {
  return html`
    <div class="bc-badge">${text}</div>
  `
}
