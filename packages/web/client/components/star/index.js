/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import cn from 'classnames'

/** @type{FunctionComponent<{
 * starred: boolean,
 * onToggleStar: (ev: MouseEvent) => void
}>} */
export const star = ({
  starred = false,
  onToggleStar = () => {},
}) => {
  return html`
    <span class="${cn({ 'bc-starred': starred, 'bc-unstarred': !starred, 'bc-star': true })}" onClick=${onToggleStar}>
      ${starred
        ? '★'
        : '☆'
        }
    </span>`
}
