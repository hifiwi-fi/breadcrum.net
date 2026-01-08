/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
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
    <table class="bc-admin-users-table">
      <thead>
        <tr>
          <th>Edit</th>
          <th>ID</th>
          <th>username</th>
          <th>email</th>
          <th>email_confirmed</th>
          <th>pending_email_update</th>
          <th>newsletter_subscription</th>
          <th>disabled_email</th>
          <th>disabled</th>
          <th>disabled_reason</th>
          <th>internal_note</th>
          <th>last_seen</th>
          <th>IP</th>
          <th>user_agent</th>
          <th>created_at</th>
          <th>updated_at</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => html`
          <${UserRow} key=${u.id} user=${u} reload=${reload} onDelete=${onDelete} />
        `)}
      </tbody>
    </table>
  `
}
