/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 *  onEdit?: () => void,
 * }} UsernameViewProps
 */

/**
 * @type {FunctionComponent<UsernameViewProps>}
 */
export const UsernameView = ({ user, onEdit }) => {
  return html`
    <dt>username</dt>
    <dd class="username-view">
      <span>${user?.username}</span>
      <span><button onClick=${onEdit}>Edit</button></span>
    </dd>
  `
}
