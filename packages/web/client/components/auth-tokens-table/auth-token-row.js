/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { fetch } from 'fetch-undici'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'

export const authTokenRow = Component(({ token, reload, onDelete }) => {
  const state = useLSP()
  const window = useWindow()
  const [deleted, setDeleted] = useState(false)

  const handleDelete = useCallback(async (ev) => {
    const response = await fetch(`${state.apiUrl}/user/auth-tokens/${token.jti}`, {
      method: 'DELETE',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }

    setDeleted(true)

    onDelete()
  }, [token.jti, reload, state.apiUrl, setDeleted])

  return html`
  ${deleted
  ? html`<!-- Deleted -->`
  : html`
    <tr class=${token.is_current ? 'bc-current-session' : ''}>
      <td>
        ${token.is_current
          ? html`<span class="bc-current-badge">Current</span>`
          : html`
            <button
              onclick=${handleDelete}
              disabled=${deleting}
              class="bc-delete-button"
            >
              ${deleting ? '...' : 'Revoke'}
            </button>
          `
        }
        ${deleteError ? html`<div class="bc-error">${deleteError.message}</div>` : null}
      </td>
      <td>
        ${token.is_current
          ? html`<span class="bc-status-active">Active</span>`
          : html`<span class="bc-status-valid">Valid</span>`
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
    </tr>
  `
  }`
})

/**
 * Format dates
 *
 * @param {string} dateString
 * @returns string
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

/**
 * Format relative time
 *
 * @param {string} dateString
 * @returns string
 */
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return formatDate(dateString)
}
