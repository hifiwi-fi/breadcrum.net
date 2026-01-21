/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeDashboardDataRead } from '../../../routes/api/admin/pgboss/schemas/schema-dashboard-data.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()

  const [dashboardData, setDashboardData] = useState(/** @type {TypeDashboardDataRead | undefined} */(undefined))
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState(/** @type {Error | null} */(null))

  useEffect(() => {
    async function getDashboard () {
      setDashboardLoading(true)
      setDashboardError(/** @type {Error | null} */(null))

      try {
        const [summaryRes, statesRes, jobsRes, maintenanceRes] = await Promise.all([
          fetch(`${state.apiUrl}/admin/pgboss/summary`, {
            method: 'get',
            headers: {
              'accept-encoding': 'application/json',
            },
          }),
          fetch(`${state.apiUrl}/admin/pgboss/states`, {
            method: 'get',
            headers: {
              'accept-encoding': 'application/json',
            },
          }),
          fetch(`${state.apiUrl}/admin/pgboss/jobs?limit=50`, {
            method: 'get',
            headers: {
              'accept-encoding': 'application/json',
            },
          }),
          fetch(`${state.apiUrl}/admin/pgboss/maintenance`, {
            method: 'get',
            headers: {
              'accept-encoding': 'application/json',
            },
          })
        ])

        if (summaryRes.ok && statesRes.ok && jobsRes.ok && maintenanceRes.ok) {
          const summary = await summaryRes.json()
          const states = await statesRes.json()
          const jobs = await jobsRes.json()
          const maintenance = await maintenanceRes.json()
          setDashboardData({ summary, states, jobs, maintenance })
        } else {
          throw new Error('Failed to load dashboard data')
        }
      } catch (err) {
        console.error(err)
        setDashboardError(/** @type {Error} */(err))
      } finally {
        setDashboardLoading(false)
      }
    }

    if (user) {
      getDashboard()
        .then(() => { console.log('dashboard done') })
        .catch(err => {
          console.error(err)
          setDashboardError(/** @type {Error} */(err))
        })
        .finally(() => { setDashboardLoading(false) })
    }
  }, [state.apiUrl, user?.id])

  if (!dashboardData && !dashboardLoading) {
    return html`
      <div class="bc-pgboss-dashboard">
        <h1>🎯 pg-boss Queue Dashboard</h1>
        <p>No data available</p>
      </div>
    `
  }

  if (dashboardLoading) {
    return html`
      <div class="bc-pgboss-dashboard">
        <h1>🎯 pg-boss Queue Dashboard</h1>
        <p>Loading...</p>
      </div>
    `
  }

  if (dashboardError) {
    return html`
      <div class="bc-pgboss-dashboard">
        <h1>🎯 pg-boss Queue Dashboard</h1>
        <p class="error">Error: ${dashboardError?.message}</p>
      </div>
    `
  }

  return html`
    <div class="bc-pgboss-dashboard">
      <h1>🎯 pg-boss Queue Dashboard</h1>

      <div class="bc-pgboss-summary">
        <h2>Overview</h2>
        <div class="bc-pgboss-stats">
          <div class="stat">
            <span class="label">Status</span>
            <span class="${`value ${dashboardData?.summary?.healthy ? 'healthy' : 'unhealthy'}`}">
              ${dashboardData?.summary?.healthy ? '✓ Healthy' : '⚠ Unhealthy'}
            </span>
          </div>
          <div class="stat">
            <span class="label">Total Jobs</span>
            <span class="value">${dashboardData?.summary?.totals?.jobs}</span>
          </div>
          <div class="stat">
            <span class="label">Active</span>
            <span class="value">${dashboardData?.summary?.totals?.active}</span>
          </div>
          <div class="stat">
            <span class="label">Pending</span>
            <span class="value">${dashboardData?.summary?.totals?.pending}</span>
          </div>

          <div class="stat">
            <span class="label">Failed</span>
            <span class="value">${dashboardData?.summary?.totals?.failed}</span>
          </div>
        </div>
      </div>

      <div class="bc-pgboss-queues">
        <h2>Queues</h2>
        ${dashboardData?.summary?.queues?.map((queue) => html`
          <div class="bc-pgboss-queue" key=${queue.name}>
            <h3>${queue.name}</h3>
            <div class="queue-stats">
              <span>Active: ${queue.active}</span>
              <span>Pending: ${queue.pending}</span>

              <span>Failed: ${queue.failed}</span>
              <span>Total: ${queue.total}</span>
            </div>
          </div>
        `)}
      </div>

      <div class="bc-pgboss-recent-failures">
        <h2>Recent Failures</h2>
        ${(dashboardData?.summary?.recent_failures?.length ?? 0) === 0
          ? html`<p>No recent failures</p>`
          : html`
            <ul>
              ${dashboardData?.summary?.recent_failures?.map((failure, index) => html`
                <li key=${index}>
                  <strong>${failure.name}</strong> -
                  ${new Date(failure.completed_on).toLocaleString()}
                  ${failure.output ? html`<pre>${JSON.stringify(failure.output, null, 2)}</pre>` : ''}
                </li>
              `)}
            </ul>
          `
        }
      </div>

      <div class="bc-pgboss-jobs">
        <h2>Recent Jobs</h2>
        <table>
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
            ${dashboardData?.jobs?.jobs?.map((job) => html`
              <tr key=${job.id}>
                <td><code>${job.id.slice(0, 8)}...</code></td>
                <td>${job.name}</td>
                <td class="${`state-${job.state}`}">${job.state}</td>
                <td>${new Date(job.created_on).toLocaleString()}</td>
                <td>
                  <details>
                    <summary>View</summary>
                    <pre>${JSON.stringify(job.data, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      <div class="bc-pgboss-maintenance">
        <h2>Supervision & Maintenance</h2>

        <div class="maintenance-section">
          <h3>Queue Supervision</h3>
          <p>
            <strong>Last run:</strong> ${
              dashboardData?.maintenance?.last_supervise
                ? new Date(dashboardData.maintenance.last_supervise).toLocaleString()
                : 'Never'
            }
          </p>
          <p>
            <strong>Interval:</strong> ${dashboardData?.maintenance?.supervise_interval_seconds}s
            (monitors queues, expires active jobs)
          </p>
          <p>
            <strong>Status:</strong>
            <span class="${dashboardData?.maintenance?.supervision_overdue ? 'status-warning' : 'status-ok'}">
              ${dashboardData?.maintenance?.supervision_overdue ? '⚠ Overdue' : '✓ Running'}
            </span>
          </p>
        </div>

        <div class="maintenance-section">
          <h3>Job Cleanup (Maintenance)</h3>
          <p>
            <strong>Last run:</strong> ${
              dashboardData?.maintenance?.last_maintenance
                ? new Date(dashboardData.maintenance.last_maintenance).toLocaleString()
                : 'Never'
            }
          </p>
          <p>
            <strong>Interval:</strong> ${dashboardData?.maintenance?.maintenance_interval_seconds}s
            (${Math.round((dashboardData?.maintenance?.maintenance_interval_seconds || 0) / 3600)}h - deletes old completed jobs)
          </p>
          <p>
            <strong>Retention:</strong> ${Math.round((dashboardData?.maintenance?.delete_after_seconds || 0) / 86400)} days
          </p>
          <p>
            <strong>Status:</strong>
            <span class="${dashboardData?.maintenance?.maintenance_overdue ? 'status-warning' : 'status-ok'}">
              ${dashboardData?.maintenance?.maintenance_overdue ? '⚠ Overdue' : '✓ Running'}
            </span>
          </p>
        </div>

        <div class="maintenance-section">
          <h3>Installation</h3>
          <p>
            <strong>Schema Status:</strong>
            ${dashboardData?.maintenance?.is_installed ? '✓ Installed' : '✗ Not Installed'}
            ${dashboardData?.maintenance?.version ? ` (v${dashboardData.maintenance.version})` : ''}
          </p>
        </div>
      </div>
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
