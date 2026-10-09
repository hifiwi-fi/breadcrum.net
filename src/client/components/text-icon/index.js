/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'

/**
 * @typedef {object} TextIconProps
 * @property {string} value
 */

/**
 * @type {FunctionComponent<TextIconProps>}
 */
export const TextIcon = ({ value }) => {
  return html`<span class='bc-text-icon'>${value}</span>`
}
