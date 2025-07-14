/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import { authTokenRow } from './auth-token-row.js'

export const authTokensTable = Component(({ tokens, reload, onDelete }) => {
  return html`
    <table class="bc-auth-tokens-table">
      <thead>
        <tr>
          <th>Actions</th>
          <th>Status</th>
          <th>Last Used</th>
          <th>Created</th>
          <th>User Agent</th>
          <th>IP Address</th>
        </tr>
      </thead>
      <tbody>
        ${tokens.map(t => html.for(t, t.jti)`${authTokenRow({
          token: t,
          reload,
          onDelete,
        })}`)}
      </tbody>
    </table>
  `
})
