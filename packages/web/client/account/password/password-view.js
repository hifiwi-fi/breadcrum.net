/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'

/**
 * @typedef {{
 *  user?: TypeUserRead | null,
 *  onEdit?: () => void,
 *  disabled?: boolean,
 * }} PasswordViewProps
 */

/**
 * @type {FunctionComponent<PasswordViewProps>}
 */
export const PasswordView = ({ onEdit, disabled = false }) => {
  return html`
    <dt>password</dt>
    <dd class="password-view">
      <span>**************</span>
      <span><button onClick=${onEdit} disabled=${disabled}>Edit</button></span>
    </dd>
  `
}
