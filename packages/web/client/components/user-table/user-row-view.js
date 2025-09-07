/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 */

import { html } from 'htm/preact'

/**
 * @typedef {object} UserRowViewProps
 * @property {SchemaTypeAdminUserReadClient} user
 * @property {() => void} [onEdit]
 */

/**
 * @type {FunctionComponent<UserRowViewProps>}
 */
export const UserRowView = ({
  user: u,
  onEdit = () => {},
}) => {
  return html`
    <tr class="bc-user-row-view">
      <td><button onClick=${onEdit}>Edit</button></td>
      <td><a href="${`./view/?id=${u.id}`}">${u.id}</a></td>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${u.email_confirmed ? '✅' : '❌'}</td>
      <td>${u.pending_email_update}</td>
      <td>${u.newsletter_subscription ? '✅' : '❌'}</td>
      <td>${u.disabled_email ? '✅' : '❌'}</td>
      <td>${u.disabled ? '✅' : '❌'}</td>
      <td>${u.disabled_reason}</td>
      <td>${u.internal_note}</td>
      <td>
        <time datetime="${u.created_at}">
          ${(new Date(u.created_at)).toLocaleString()}
        </time>
      </td>
      <td>
        ${u.updated_at
          ? html`<time datetime="${u.updated_at}">
                  ${(new Date(u.updated_at)).toLocaleString()}
                </time>`
          : null
        }
      </td>
    </tr>
  `
}
