/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import cn from 'classnames'

/** @type{FunctionComponent<{
 * starred: boolean,
 * onToggleStar: (ev: MouseEvent) => void,
 * disabled?: boolean
}>} */
export const Star = ({
  starred = false,
  onToggleStar = () => {},
  disabled = false,
}) => {
  return html`
    <span class="${cn({ 'bc-starred': starred, 'bc-unstarred': !starred, 'bc-star': true })}" onClick=${disabled ? undefined : onToggleStar} aria-disabled=${disabled ? 'true' : undefined}>
      ${starred
        ? '★'
        : '☆'
        }
    </span>`
}
