/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'

/**
 * @typedef {{
 * beforeParams: string | undefined | null
 * afterParams: string | undefined | null
 * onPageNav: (ev: MouseEvent & {currentTarget: HTMLAnchorElement}) => void
 }} PaginationButtonParams
 */

/**
 * @type {FunctionComponent<PaginationButtonParams>}
 */
export const PaginationButtons = ({
  onPageNav,
  beforeParams,
  afterParams
}) => {
  return html`
    <div class="pagination-buttons">
      ${beforeParams ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
      ${afterParams ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
    </div>
  `
}
