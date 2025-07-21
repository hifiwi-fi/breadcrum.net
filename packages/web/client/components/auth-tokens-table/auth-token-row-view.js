/* eslint-env browser */

import { Component, html } from 'uland-isomorphic'
import { formatDate, formatRelativeTime } from '../../lib/format-relative-time.js'

export const authTokenRowView = Component(({
  token,
  onEdit = () => {},
}) => {
  return html`
    <tr class=${token.is_current ? 'bc-current-session' : ''}>
      <td>
        ${token.is_current
          ? html`<span class="bc-active-note">Active</span> ${token.note ? html` · ${token.note}` : ''}`
          : token.note || html`<span class="bc-muted">—</span>`
        }
      </td>
      <td title=${formatDate(token.last_seen)}>
        ${formatRelativeTime(token.last_seen)}
      </td>
      <td title=${formatDate(token.created_at)}>
        ${formatRelativeTime(token.created_at)}
      </td>
      <td>
        ${token.user_agent
          ? html`<code class="bc-user-agent">${token.user_agent}</code>`
          : html`<span class="bc-muted">Unknown</span>`
        }
      </td>
      <td>
        ${token.ip
          ? html`<code>${token.ip}</code>`
          : html`<span class="bc-muted">Unknown</span>`
        }
      </td>
      <td><button onClick=${onEdit}>Edit</button></td>
    </tr>
  `
})
