/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeAdminStatsReadClient } from '../../../api/admin/stats/schemas/schema-admin-stats-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'

const countFormatter = new Intl.NumberFormat('en-US')

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()

  const [stats, setStats] = useState(/** @type {TypeAdminStatsReadClient | null} */(null))
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(/** @type {Error | null} */(null))

  /** @param {string | number | null | undefined} value */
  const formatCount = (value) => {
    const numberValue = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numberValue)) return '0'
    return countFormatter.format(numberValue)
  }

  /**
   * @param {TypeAdminStatsReadClient['totalUsers'] | null | undefined} rows
   * @returns {string | number}
   */
  const getTotalUsersCount = (rows) => rows?.[0]?.users_count ?? '0'

  /**
   * @param {TypeAdminStatsReadClient['totalBookmarks'] | null | undefined} rows
   * @returns {string | number}
   */
  const getTotalBookmarksCount = (rows) => rows?.[0]?.bookmark_count ?? '0'

  /**
   * @param {TypeAdminStatsReadClient['cumulativeCounts'][number]} row
   * @param {string} year
   * @returns {string | number | null}
   */
  const getCumulativeValue = (row, year) => {
    const value = row[year]
    if (typeof value === 'string' || typeof value === 'number') return value
    return null
  }

  const bookmarkStats = Array.isArray(stats?.bookmarkStats) ? stats.bookmarkStats : []
  const cumulativeCounts = Array.isArray(stats?.cumulativeCounts) ? stats.cumulativeCounts : []
  const totalUsersCount = getTotalUsersCount(stats?.totalUsers)
  const totalBookmarksCount = getTotalBookmarksCount(stats?.totalBookmarks)
  const firstCountRow = cumulativeCounts[0]
  const yearKeys = firstCountRow
    ? Object.keys(firstCountRow)
      .filter(key => key !== 'label')
      .sort((a, b) => Number(a) - Number(b))
    : []

  useEffect(() => {
    async function getStats () {
      setStatsLoading(true)
      setStatsError(null)

      try {
        const response = await fetch(`${state.apiUrl}/admin/stats`, {
          method: 'get',
          headers: {
            'accept-encoding': 'application/json',
          },
        })

        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          /** @type {TypeAdminStatsReadClient} */
          const body = await response.json()
          setStats(body)
        } else {
          throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
        }
      } catch (err) {
        console.error(err)
        setStatsError(/** @type {Error} */(err))
      } finally {
        setStatsLoading(false)
      }
    }

    if (user) {
      getStats()
        .then(() => { console.log('stats done') })
        .catch(err => {
          console.error(err)
          setStatsError(/** @type {Error} */(err))
        })
        .finally(() => { setStatsLoading(false) })
    }
  }, [state.apiUrl, user?.id])

  return html`
    <div class="bc-admin-stats">
      <h1>Stats</h1>
      ${statsLoading ? html`<p class="bc-admin-stats-loading">Loading stats...</p>` : null}
      ${statsError ? html`<p class="bc-admin-stats-error">${statsError.message}</p>` : null}
      ${stats
        ? html`
        <section class="bc-admin-stats-summary">
          <div class="bc-admin-stats-card">
            <span class="bc-admin-stats-label">Total users</span>
            <span class="bc-admin-stats-value">${formatCount(totalUsersCount)}</span>
          </div>
          <div class="bc-admin-stats-card">
            <span class="bc-admin-stats-label">Total bookmarks</span>
            <span class="bc-admin-stats-value">${formatCount(totalBookmarksCount)}</span>
          </div>
        </section>
        <section class="bc-admin-stats-section">
          <h2>Bookmarks in the last 30 days</h2>
          ${bookmarkStats.length > 0
            ? html`
              <div class="bc-admin-stats-table-wrapper">
                <table class="bc-admin-stats-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Bookmarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${bookmarkStats.slice(0, 15).map(row => html`
                      <tr>
                        <td>${row.username}</td>
                        <td>${row.email ?? '-'}</td>
                        <td>${formatCount(row.bookmark_count)}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>
            `
            : html`<p class="bc-admin-stats-empty">No bookmarks counted in the last 30 days.</p>`
          }
        </section>
        <section class="bc-admin-stats-section">
          <h2>Cumulative counts by year</h2>
          ${cumulativeCounts.length > 0
            ? html`
              <div class="bc-admin-stats-table-wrapper">
                <table class="bc-admin-stats-table">
                  <thead>
                    <tr>
                      <th>Label</th>
                      ${yearKeys.map(year => html`<th>${year}</th>`)}
                    </tr>
                  </thead>
                  <tbody>
                    ${cumulativeCounts.map(row => html`
                      <tr>
                        <td>${row.label}</td>
                        ${yearKeys.map(year => html`<td>${formatCount(getCumulativeValue(row, year))}</td>`)}
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>
            `
            : html`<p class="bc-admin-stats-empty">No yearly counts available.</p>`
          }
        </section>
      `
        : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
