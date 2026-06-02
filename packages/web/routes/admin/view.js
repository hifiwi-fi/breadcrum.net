/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {ViewContext} AdminIndexContext
 */

const adminLinks = /** @type {const} */ ([
  { href: '/admin/users/', label: 'Users' },
  { href: '/admin/flags/', label: 'Flags' },
  { href: '/admin/redis-cache/', label: 'Redis cache' },
  { href: '/admin/stats/', label: 'Stats' },
  { href: '/admin/deps/', label: 'Deps' },
  { href: '/admin/pgboss/', label: 'pg-boss queue dashboard' },
])

/**
 * @type {FragtmlTemplate<AdminIndexContext, AppLayoutName, AppFragmentId>}
 */
export const adminIndexPage = (_context) => html/* html */`
  <div class="bc-admin-page">
    <h1>Admin</h1>
    <nav class="bc-admin-nav" aria-label="Admin sections">
      ${adminLinks.map(link => html`<a href="${link.href}">${link.label}</a>`)}
      <a href="https://uptime.betterstack.com/team/111238/status-pages/159520/reports">Status page reports</a>
    </nav>
  </div>
`
