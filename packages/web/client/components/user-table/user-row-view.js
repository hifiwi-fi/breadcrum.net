/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 */

import { html } from 'htm/preact'
import cn from 'classnames'
import { formatUserAgent } from './format-user-agent.js'

/**
 * @param {SchemaTypeAdminUserReadClient['geoip']} geoip
 * @returns {string}
 */
function formatGeoip (geoip) {
  if (!geoip) return 'Unknown'
  const flag = geoip.flag_emoji
  const parts = [
    geoip.city_name,
    geoip.region_name,
    geoip.country_name,
  ].filter(Boolean)
  const location = parts.length ? parts.join(', ') : null
  if (flag && location) return `${flag} ${location}`
  if (flag) return flag
  return location ?? 'Unknown'
}

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
  const viewHref = `./view/?id=${u.id}`
  const pendingEmailUpdate = u.pending_email_update || ''
  const disabledReason = u.disabled_reason || ''
  const internalNote = u.internal_note || ''
  const latestUserAgent = formatUserAgent(u.user_agent)
  const registrationUserAgent = formatUserAgent(u.registration_user_agent)
  const latestGeoip = formatGeoip(u.geoip)
  const registrationGeoip = formatGeoip(u.registration_geoip)

  return html`
    <article class="bc-user-card" role="listitem">
      <div class="bc-user-card-header">
        <div class="bc-user-heading">
          <div class="bc-user-identity">
            <a class="bc-user-username" href="${viewHref}">${u.username}</a>
            <div class="bc-user-email">${u.email}</div>
          </div>
          <div class="bc-user-id-line">
            <span class="bc-user-label">ID</span>
            <a class="bc-user-id-link" href="${viewHref}">
              <code class="bc-user-id">${u.id}</code>
            </a>
          </div>
        </div>
        <div class="bc-user-actions">
          <button type="button" onClick=${onEdit}>Edit</button>
        </div>
      </div>

      <div class="bc-user-status-row">
        <span class="${cn({
          'bc-user-badge': true,
          'bc-user-badge-true': u.email_confirmed,
          'bc-user-badge-warning': !u.email_confirmed,
        })}">
          ${u.email_confirmed ? 'Email confirmed' : 'Email unconfirmed'}
        </span>
        <span class="${cn({
          'bc-user-badge': true,
          'bc-user-badge-true': u.newsletter_subscription,
          'bc-user-badge-false': !u.newsletter_subscription,
        })}">
          ${u.newsletter_subscription ? 'Newsletter subscribed' : 'Newsletter unsubscribed'}
        </span>
        <span class="${cn({
          'bc-user-badge': true,
          'bc-user-badge-true': !u.disabled_email,
          'bc-user-badge-false': u.disabled_email,
          'bc-user-badge-danger': u.disabled_email,
        })}">
          ${u.disabled_email ? 'Email disabled' : 'Email ok'}
        </span>
        <span class="${cn({
          'bc-user-badge': true,
          'bc-user-badge-true': !u.disabled,
          'bc-user-badge-false': u.disabled,
          'bc-user-badge-danger': u.disabled,
        })}">
          ${u.disabled ? 'Account disabled' : 'Account active'}
        </span>
      </div>

      <div class="bc-user-grid">
        <div class="bc-user-field">
          <div class="bc-user-label">Pending email update</div>
          <div class="${cn({
            'bc-user-value': true,
            'bc-user-value-empty': !pendingEmailUpdate,
          })}">
            ${pendingEmailUpdate || 'None'}
          </div>
        </div>
        <div class="bc-user-field">
          <div class="bc-user-label">Disabled reason</div>
          <div class="${cn({
            'bc-user-value': true,
            'bc-user-value-multiline': true,
            'bc-user-value-empty': !disabledReason,
          })}">
            ${disabledReason || 'None'}
          </div>
        </div>
        <div class="bc-user-field">
          <div class="bc-user-label">Internal note</div>
          <div class="${cn({
            'bc-user-value': true,
            'bc-user-value-multiline': true,
            'bc-user-value-empty': !internalNote,
          })}">
            ${internalNote || 'None'}
          </div>
        </div>
      </div>

      <div class="bc-user-meta">
        <div class="bc-user-meta-section">
          <div class="bc-user-meta-title">Activity</div>
          <div class="bc-user-meta-grid">
            <div class="bc-user-field">
              <div class="bc-user-label">Last seen</div>
              ${u.last_seen
                ? html`<time class="bc-user-value" datetime="${u.last_seen}">
                        ${(new Date(u.last_seen)).toLocaleString()}
                      </time>`
                : html`<div class="${cn({
                  'bc-user-value': true,
                  'bc-user-value-empty': true,
                })}">Never</div>`
              }
            </div>
            <div class="bc-user-field">
              <div class="bc-user-label">Created</div>
              <time class="bc-user-value" datetime="${u.created_at}">
                ${(new Date(u.created_at)).toLocaleString()}
              </time>
            </div>
            <div class="bc-user-field">
              <div class="bc-user-label">Updated</div>
              ${u.updated_at
                ? html`<time class="bc-user-value" datetime="${u.updated_at}">
                        ${(new Date(u.updated_at)).toLocaleString()}
                      </time>`
                : html`<div class="${cn({
                  'bc-user-value': true,
                  'bc-user-value-empty': true,
                })}">Never</div>`
              }
            </div>
          </div>
        </div>
        <div class="bc-user-meta-section">
          <div class="bc-user-meta-title">Client</div>
          <div class="bc-user-meta-grid">
            <div class="bc-user-field">
              <div class="bc-user-label">IP</div>
              <code class="${cn({
                'bc-user-value': true,
                'bc-user-value-mono': true,
                'bc-user-value-empty': !u.ip,
              })}">
                ${u.ip || 'Unknown'}
              </code>
            </div>
            <div class="bc-user-field">
              <div class="bc-user-label">User agent</div>
              <div class="${cn({
                'bc-user-value': true,
                'bc-user-value-empty': !u.user_agent,
              })}">
                ${latestUserAgent}
              </div>
            </div>
            <div class="bc-user-field">
              <div class="bc-user-label">GeoIP</div>
              <div class="${cn({
                'bc-user-value': true,
                'bc-user-value-empty': !u.geoip,
              })}">
                ${latestGeoip}
              </div>
              ${u.geoip?.time_zone
                ? html`<div class="bc-user-subvalue">${u.geoip.time_zone}</div>`
                : null
              }
            </div>
            <div class="bc-user-field">
              <div class="bc-user-label">Registration IP</div>
              <code class="${cn({
                'bc-user-value': true,
                'bc-user-value-mono': true,
                'bc-user-value-empty': !u.registration_ip,
              })}">
                ${u.registration_ip || 'Unknown'}
              </code>
            </div>
            <div class="bc-user-field">
              <div class="bc-user-label">Registration user agent</div>
              <div class="${cn({
                'bc-user-value': true,
                'bc-user-value-empty': !u.registration_user_agent,
              })}">
                ${registrationUserAgent}
              </div>
            </div>
            <div class="bc-user-field">
              <div class="bc-user-label">Registration GeoIP</div>
              <div class="${cn({
                'bc-user-value': true,
                'bc-user-value-empty': !u.registration_geoip,
              })}">
                ${registrationGeoip}
              </div>
              ${u.registration_geoip?.time_zone
                ? html`<div class="bc-user-subvalue">${u.registration_geoip.time_zone}</div>`
                : null
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  `
}
