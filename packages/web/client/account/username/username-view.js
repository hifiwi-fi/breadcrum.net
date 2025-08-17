/// <reference lib="dom" />
/* eslint-env browser */

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
    <dd>
      ${user?.username}
      <button onClick=${onEdit}>Edit</button>
    </dd>
  `
}
