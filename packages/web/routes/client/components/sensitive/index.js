/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'

/** @type{FunctionComponent<{
 * sensitive: boolean,
 * onToggleSensitive: (ev: MouseEvent) => void
}>} */
export const Sensitive = ({
  sensitive = false,
  onToggleSensitive = () => {},
}) => {
  return html`
    <span class="${sensitive ? 'bc-sensitive' : 'bc-unsensitive'}" onClick=${onToggleSensitive}>
      ${sensitive
        ? '🤫'
        : '🫥'
        }
    </span>`
}
