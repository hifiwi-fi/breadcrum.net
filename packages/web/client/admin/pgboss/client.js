/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeDashboardDataRead } from '../../../routes/api/admin/pgboss/schemas/schema-dashboard-data.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()

  useEffect(() => {
    if ((!user && !loading) && window) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading, window])

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
  }, [state.apiUrl, user])

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
            <span class="label">Completed</span>
            <span class="value">${dashboardData?.summary?.totals?.completed}</span>
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
              <span>Completed: ${queue.completed}</span>
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
        <h2>Maintenance</h2>
        <p>Last run: ${dashboardData?.maintenance?.maintained_on ? new Date(dashboardData.maintenance.maintained_on).toLocaleString() : 'Never'}</p>
        <p>Status: ${dashboardData?.maintenance?.is_installed ? '✓ Installed' : '✗ Not Installed'}</p>
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
