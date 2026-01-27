/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'

/** @type {FunctionComponent<{ label?: string }>}
 */
export const ResolveStatus = ({ label = 'Resolving' }) => {
  return html`
    <span class="bc-resolve-status">
      <span aria-hidden="true">⏱</span>
      <span>${label}</span>
      <span class="bc-resolve-dots" aria-hidden="true"></span>
    </span>
  `
}
