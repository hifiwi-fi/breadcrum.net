/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { cachePrefixes } from '#service-worker-settings'

/**
 * @typedef {object} CacheEntrySummary
 * @property {string} method
 * @property {string} url
 */

/**
 * @typedef {object} CacheSummary
 * @property {number} entryCount
 * @property {CacheEntrySummary[]} entries
 * @property {string} name
 * @property {boolean} owned
 */

/** @type {FunctionComponent} */
export const Page = () => {
  const [cachesSupported, setCachesSupported] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(/** @type {Error | null} */ (null))
  const [summaries, setSummaries] = useState(/** @type {CacheSummary[]} */ ([]))

  const refresh = useCallback(async () => {
    if (!('caches' in window)) {
      setCachesSupported(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setSummaries(await readCacheSummaries())
    } catch (err) {
      setError(/** @type {Error} */ (err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(err => {
      setError(/** @type {Error} */ (err))
      setIsLoading(false)
    })
  }, [refresh])

  const totalEntries = summaries.reduce((total, summary) => total + summary.entryCount, 0)
  const ownedCaches = summaries.filter(summary => summary.owned)

  return html`
    <div class="bc-cache-inspector">
      <h2>Cache Inspector</h2>

      <p>
        Inspect Cache Storage entries visible to this origin.
        Breadcrum-owned caches are detected from the PWA cache prefixes.
      </p>

      <div class="bc-cache-inspector-actions">
        <button type="button" disabled=${isLoading} onClick=${refresh}>
          ${isLoading ? 'Refreshing…' : 'Refresh caches'}
        </button>
      </div>

      ${!cachesSupported
        ? html`<p class="error">Cache Storage is not available in this browser context.</p>`
        : null}

      ${error ? html`<p class="error">${error.message}</p>` : null}

      ${cachesSupported
        ? html`
          <dl class="bc-cache-inspector-summary">
            <div>
              <dt>Total caches</dt>
              <dd>${summaries.length}</dd>
            </div>
            <div>
              <dt>Breadcrum caches</dt>
              <dd>${ownedCaches.length}</dd>
            </div>
            <div>
              <dt>Total entries</dt>
              <dd>${totalEntries}</dd>
            </div>
          </dl>
        `
        : null}

      ${isLoading
        ? html`<p>Loading caches…</p>`
        : renderCacheSummaries(summaries)}
    </div>
  `
}

/** @returns {Promise<CacheSummary[]>} */
async function readCacheSummaries () {
  const names = await caches.keys()
  const summaries = await Promise.all(names.sort().map(readCacheSummary))
  return summaries.sort((a, b) => Number(b.owned) - Number(a.owned) || a.name.localeCompare(b.name))
}

/**
 * @param {string} name
 * @returns {Promise<CacheSummary>}
 */
async function readCacheSummary (name) {
  const cache = await caches.open(name)
  const requests = await cache.keys()

  return {
    entryCount: requests.length,
    entries: requests.map(request => ({
      method: request.method,
      url: request.url,
    })),
    name,
    owned: cachePrefixes.some(prefix => name.startsWith(prefix)),
  }
}

/** @param {CacheSummary[]} summaries */
function renderCacheSummaries (summaries) {
  if (summaries.length === 0) {
    return html`<p>No Cache Storage entries found.</p>`
  }

  return html`
    <div class="bc-cache-inspector-list">
      ${summaries.map(summary => html`
        <details class="bc-cache-inspector-cache" open=${summary.owned}>
          <summary>
            <span>${summary.name}</span>
            ${summary.owned ? html`<strong>Breadcrum</strong>` : null}
            <code>${summary.entryCount} entries</code>
          </summary>

          ${summary.entries.length
            ? html`
              <ol>
                ${summary.entries.map(entry => html`
                  <li>
                    <code>${entry.method}</code>
                    <a href=${entry.url}>${new URL(entry.url).pathname}</a>
                  </li>
                `)}
              </ol>
            `
            : html`<p>This cache is empty.</p>`}
        </details>
      `)}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page} />`, container)
  }
}
