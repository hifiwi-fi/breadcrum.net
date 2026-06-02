/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'

/** @type{FunctionComponent<{
 * sensitive: boolean,
 * onToggleSensitive: (ev: MouseEvent) => void,
 * disabled?: boolean
}>} */
export const Sensitive = ({
  sensitive = false,
  onToggleSensitive = () => {},
  disabled = false,
}) => {
  return html`
    <span class="${sensitive ? 'bc-sensitive' : 'bc-unsensitive'}" onClick=${disabled ? undefined : onToggleSensitive} aria-disabled=${disabled ? 'true' : undefined}>
      ${sensitive
        ? '🤫'
        : '🫥'
        }
    </span>`
}
