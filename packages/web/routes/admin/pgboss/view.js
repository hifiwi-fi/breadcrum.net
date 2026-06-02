/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} AdminPgBossData
 * @property {Record<string, any>} summary
 * @property {Record<string, any>} states
 * @property {{ jobs?: Array<Record<string, any>>, pagination?: Record<string, any> }} jobs
 * @property {Record<string, any>} maintenance
 */

/**
 * @typedef {ViewContext & { adminPgBoss: { data: AdminPgBossData, error: string } }} AdminPgBossContext
 */

/**
 * @type {FragtmlTemplate<AdminPgBossContext, AppLayoutName, AppFragmentId>}
 */
export const adminPgBossPage = (context) => {
  const { data, error } = context.adminPgBoss
  const summary = data.summary
  const maintenance = data.maintenance
  const jobs = Array.isArray(data.jobs.jobs) ? data.jobs.jobs : []
  const queues = Array.isArray(summary['queues']) ? summary['queues'] : []
  const failures = Array.isArray(summary['recent_failures']) ? summary['recent_failures'] : []

  return html/* html */`
    <div class="bc-admin-page bc-admin-pgboss">
      <h1>pg-boss queue dashboard</h1>
      ${adminNav()}
      ${error ? html`<div class="bc-form-errors" role="alert"><p>${error}</p></div>` : null}
      <section class="bc-admin-summary-grid">
        <div class="bc-admin-summary-item">
          <span>Status</span>
          <strong>${summary['healthy'] ? 'Healthy' : 'Unhealthy'}</strong>
        </div>
        <div class="bc-admin-summary-item">
          <span>Total jobs</span>
          <strong>${summary['totals']?.jobs ?? 0}</strong>
        </div>
        <div class="bc-admin-summary-item">
          <span>Active</span>
          <strong>${summary['totals']?.active ?? 0}</strong>
        </div>
        <div class="bc-admin-summary-item">
          <span>Pending</span>
          <strong>${summary['totals']?.pending ?? 0}</strong>
        </div>
        <div class="bc-admin-summary-item">
          <span>Failed</span>
          <strong>${summary['totals']?.failed ?? 0}</strong>
        </div>
      </section>
      <section>
        <h2>Queues</h2>
        ${queues.length === 0
          ? html`<p class="bc-help-text">No queues found.</p>`
          : html/* html */`
            <div class="bc-admin-table-wrap">
              <table class="bc-admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Active</th>
                    <th>Pending</th>
                    <th>Failed</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${queues.map(queue => html/* html */`
                    <tr>
                      <td>${queue.name}</td>
                      <td>${queue.active}</td>
                      <td>${queue.pending}</td>
                      <td>${queue.failed}</td>
                      <td>${queue.total}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `}
      </section>
      <section>
        <h2>Recent failures</h2>
        ${failures.length === 0
          ? html`<p class="bc-help-text">No recent failures.</p>`
          : html/* html */`
            <div class="bc-admin-table-wrap">
              <table class="bc-admin-table">
                <thead>
                  <tr>
                    <th>Queue</th>
                    <th>Completed</th>
                    <th>Retries</th>
                    <th>Output</th>
                  </tr>
                </thead>
                <tbody>
                  ${failures.map(failure => html/* html */`
                    <tr>
                      <td>${failure.name}</td>
                      <td>${dateText(failure.completed_on)}</td>
                      <td>${failure.retry_count ?? 0}</td>
                      <td><pre>${jsonText(failure.output)}</pre></td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `}
      </section>
      <section>
        <h2>Recent jobs</h2>
        ${jobs.length === 0
          ? html`<p class="bc-help-text">No jobs found.</p>`
          : html/* html */`
            <div class="bc-admin-table-wrap">
              <table class="bc-admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Queue</th>
                    <th>State</th>
                    <th>Created</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  ${jobs.map(job => html/* html */`
                    <tr>
                      <td><code>${String(job['id'] ?? '').slice(0, 8)}</code></td>
                      <td>${job['name']}</td>
                      <td>${job['state']}</td>
                      <td>${dateText(job['created_on'])}</td>
                      <td><details><summary>View</summary><pre>${jsonText(job['data'])}</pre></details></td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `}
      </section>
      <section>
        <h2>Maintenance</h2>
        <dl class="bc-admin-user-notes">
          <dt>Installed</dt>
          <dd>${maintenance['is_installed'] ? 'Yes' : 'No'}</dd>
          <dt>Version</dt>
          <dd>${maintenance['version'] ?? 'Unknown'}</dd>
          <dt>Last supervise</dt>
          <dd>${dateText(maintenance['last_supervise'])}</dd>
          <dt>Last maintenance</dt>
          <dd>${dateText(maintenance['last_maintenance'])}</dd>
          <dt>Supervision overdue</dt>
          <dd>${maintenance['supervision_overdue'] ? 'Yes' : 'No'}</dd>
          <dt>Maintenance overdue</dt>
          <dd>${maintenance['maintenance_overdue'] ? 'Yes' : 'No'}</dd>
        </dl>
      </section>
    </div>
  `
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function dateText (value) {
  if (!value) return 'Never'
  const date = new Date(String(value))
  return Number.isNaN(date.valueOf()) ? 'Never' : date.toLocaleString()
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function jsonText (value) {
  return JSON.stringify(value ?? null, null, 2)
}

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function adminNav () {
  return html/* html */`
    <nav class="bc-admin-subnav" aria-label="Admin navigation">
      <a href="/admin/">Admin</a>
      <a href="/admin/stats/">Stats</a>
      <a href="/admin/users/">Users</a>
      <a href="/admin/flags/">Flags</a>
    </nav>
  `
}
