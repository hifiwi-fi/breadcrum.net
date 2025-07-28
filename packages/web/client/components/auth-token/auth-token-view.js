/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeAuthTokenRead } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
*/

// @ts-expect-error
import { Component, html } from 'uland-isomorphic'
import cn from 'classnames'

/**
 * @typedef {({
 *  authToken,
 *  onEdit,
 * }: {
 *  authToken: TypeAuthTokenRead,
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
      <div class="bc-auth-token-title-line">
        <span class="${cn({
          'bc-auth-token-note': true,
          'bc-auth-token-note-empty': !t.note
        })}">
          ${t.note || 'Untitled token'}
        </span>
        <span class="bc-auth-token-status-badges">
          ${t.is_current ? html`<span class="bc-auth-token-current-badge">✓ Current</span>` : null}
          ${t.protect ? html`<span class="bc-auth-token-protected-badge">🔒 Protected</span>` : null}
        </span>
      </div>

      <div class="bc-auth-token-details">
        <div class="bc-auth-token-jti">
          jti: <code>${t.jti}</code>
        </div>
        <div class="bc-date">
          <a href="${`/account/auth-tokens/view/?jti=${t.jti}`}">
              Last seen: <time datetime="${t.last_seen}">
                ${(new Date(t.last_seen)).toLocaleString()}
              </time>
            </a>
        </div>
        <div class="bc-date">
          <a href="${`/account/auth-tokens/view/?jti=${t.jti}`}">
            Created: <time datetime="${t.created_at}">
              ${(new Date(t.created_at)).toLocaleString()}
            </time>
          </a>
        </div>
        <div class="bc-date">
          <a href="${`/account/auth-tokens/view/?jti=${t.jti}`}">
            Updated: <time datetime="${t.updated_at}">
              ${(new Date(t.updated_at)).toLocaleString()}
            </time>
          </a>
        </div>
        <div class="bc-auth-token-source">
          Source: <span class="bc-auth-token-source-value">${t.source}</span>
        </div>
        ${t.user_agent
          ? html`
            <div class="bc-auth-token-user-agent">
              User Agent: <code>${t.user_agent}</code>
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
      <div>
        <button onClick=${onEdit}>Edit</button>
      </div>
    </div>`
})
