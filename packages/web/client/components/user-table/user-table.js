/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import { userRow } from './user-row.js'

export const userTable = Component(({ users, reload, onDelete }) => {
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
          <th>created_at</th>
          <th>updated_at</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => html.for(u, u.id)`${userRow({
          user: u,
          reload,
          onDelete,
        })}`)}
      </tbody>
    </table>
  `
})
