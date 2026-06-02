/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { TypeAdminStatsReadClient } from '../../api/admin/stats/schemas/schema-admin-stats-read.js'
 */

import html from 'fragtml'

const countFormatter = new Intl.NumberFormat('en-US')

/**
 * @typedef {ViewContext & { adminStats: TypeAdminStatsReadClient }} AdminStatsContext
 */

/**
 * @type {FragtmlTemplate<AdminStatsContext, AppLayoutName, AppFragmentId>}
 */
export const adminStatsPage = (context) => {
  const stats = context.adminStats
  const bookmarkStats = Array.isArray(stats.bookmarkStats) ? stats.bookmarkStats : []
  const cumulativeCounts = Array.isArray(stats.cumulativeCounts) ? stats.cumulativeCounts : []
  const yearKeys = cumulativeCounts[0]
    ? Object.keys(cumulativeCounts[0]).filter(key => key !== 'label').sort((a, b) => Number(a) - Number(b))
    : []

  return html/* html */`
    <div class="bc-admin-page bc-admin-stats">
      <h1>Stats</h1>
      ${adminNav()}
      <section class="bc-admin-summary-grid">
        <div class="bc-admin-summary-item">
          <span>Total users</span>
          <strong>${formatCount(stats.totalUsers?.[0]?.users_count)}</strong>
        </div>
        <div class="bc-admin-summary-item">
          <span>Total bookmarks</span>
          <strong>${formatCount(stats.totalBookmarks?.[0]?.bookmark_count)}</strong>
        </div>
      </section>
      <section>
        <h2>Bookmarks in the last 30 days</h2>
        ${bookmarkStats.length > 0
          ? html/* html */`
            <div class="bc-admin-table-wrap">
              <table class="bc-admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Bookmarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${bookmarkStats.slice(0, 15).map(row => html/* html */`
                    <tr>
                      <td>${row.username}</td>
                      <td>${row.email}</td>
                      <td>${formatCount(row.bookmark_count)}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `
          : html`<p class="bc-help-text">No bookmarks counted in the last 30 days.</p>`}
      </section>
      <section>
        <h2>Cumulative counts by year</h2>
        ${cumulativeCounts.length > 0
          ? html/* html */`
            <div class="bc-admin-table-wrap">
              <table class="bc-admin-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    ${yearKeys.map(year => html`<th>${year}</th>`)}
                  </tr>
                </thead>
                <tbody>
                  ${cumulativeCounts.map(row => html/* html */`
                    <tr>
                      <td>${row.label}</td>
                      ${yearKeys.map(year => html`<td>${formatCount(countValue(row[year]))}</td>`)}
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `
          : html`<p class="bc-help-text">No yearly counts available.</p>`}
      </section>
    </div>
  `
}

/**
 * @param {string | number | null | undefined} value
 * @returns {string}
 */
function formatCount (value) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? countFormatter.format(numberValue) : '0'
}

/**
 * @param {unknown} value
 * @returns {string | number | null}
 */
function countValue (value) {
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function adminNav () {
  return html/* html */`
    <nav class="bc-admin-subnav" aria-label="Admin navigation">
      <a href="/admin/">Admin</a>
      <a href="/admin/flags/">Flags</a>
      <a href="/admin/users/">Users</a>
      <a href="/admin/pgboss/">pg-boss</a>
    </nav>
  `
}
