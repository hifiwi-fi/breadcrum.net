/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../api/admin/users/schemas/schema-admin-user-read.js'
 */

import { html } from 'htm/preact'
import { UserRow } from './user-row.js'

/**
 * @typedef {object} UserTableProps
 * @property {SchemaTypeAdminUserReadClient[]} users
 * @property {() => void} reload
 * @property {() => void} onDelete
 */

/**
 * @type {FunctionComponent<UserTableProps>}
 */
export const UserTable = ({ users, reload, onDelete }) => {
  return html`
    <div class="bc-admin-users-list" role="list">
      ${users.map(u => html`
        <${UserRow} key=${u.id} user=${u} reload=${reload} onDelete=${onDelete} />
      `)}
    </div>
  `
}
