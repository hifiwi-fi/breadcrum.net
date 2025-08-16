/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeAuthTokenReadClient } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
*/

import { formatRelativeTime } from '../../lib/format-relative-time.js'

// @ts-expect-error
import { Component, html } from 'uland-isomorphic'
import cn from 'classnames'

/**
 * @typedef {({
 *  authToken,
 *  onEdit,
 * }: {
 *  authToken: TypeAuthTokenReadClient,
 *  onEdit?: () => void,
 * }) => any} AuthTokenView
 */

/**
  * @type {AuthTokenView}
  */
export const authTokenView = Component(/** @type{AuthTokenView} */({
  authToken: t,
  onEdit = () => {},
}) => {
  return html`
    <div class="bc-auth-token-view">
      <div class="bc-auth-token-grid">
        <div class="bc-auth-token-status-note-row">
          ${t.is_current ? html`<span class="bc-auth-token-current-badge">✓ Current</span>` : null}
          ${t.protect ? html`<span class="bc-auth-token-protected-badge">🔒 Protected</span>` : null}
          <span class="${cn({
            'bc-auth-token-note': true,
            'bc-auth-token-note-empty': !t.note
          })}">
            ${t.note || 'Untitled token'}
          </span>
        </div>

        <div class="bc-auth-token-source-jti-row">
          <div class="bc-auth-token-source">
            Source: <span class="bc-auth-token-source-value">${t.source}</span>
          </div>
          <span class="bc-auth-token-label">jti:</span>
          <code class="bc-auth-token-jti-value">${t.jti}</code>
        </div>

        <div class="bc-auth-token-client-row">
          ${t.user_agent
            ? html`
              <div class="bc-auth-token-user-agent">
                Browser: ${t.user_agent.family} ${t.user_agent.major}.${t.user_agent.minor}${t.user_agent.patch ? `.${t.user_agent.patch}` : ''}
                on ${t.user_agent.os.family} ${t.user_agent.os.major}.${t.user_agent.os.minor}${t.user_agent.os.patch ? `.${t.user_agent.os.patch}` : ''}
                ${t.user_agent.device.family !== 'Other' ? html` (${t.user_agent.device.family})` : ''}
              </div>
              `
            : null}
          ${t.ip
            ? html`
              <div class="bc-auth-token-ip">
                IP: <code>${t.ip}</code>
              </div>
            `
            : null}
        </div>

        <div class="bc-auth-token-dates">
          <div class="bc-date">
            Last seen: <time datetime="${t.last_seen}">
              ${formatRelativeTime(t.last_seen)}
            </time>
          </div>
          <div class="bc-date">
            Created: <time datetime="${t.created_at}">
              ${formatRelativeTime(t.created_at)}
            </time>
          </div>
          <div class="bc-date">
            Updated: <time datetime="${t.updated_at}">
              ${formatRelativeTime(t.updated_at)}
            </time>
          </div>
        </div>
      </div>
      <div>
        <button type="button" onClick=${onEdit}>Edit</button>
      </div>
    </div>`
})
