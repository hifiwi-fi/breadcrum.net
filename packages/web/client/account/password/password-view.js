/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'

/**
 * @typedef {{
 *  user?: TypeUserRead | null,
 *  onEdit?: () => void,
 * }} PasswordViewProps
 */

/**
 * @type {FunctionComponent<PasswordViewProps>}
 */
export const PasswordView = ({ onEdit }) => {
  return html`
    <dt>password</dt>
    <dd class="password-view">
      <span>**************</span>
      <span><button onClick=${onEdit}>Edit</button></span>
    </dd>
  `
}
