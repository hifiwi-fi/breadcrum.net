/// <reference lib="dom" />

/**
 * @import { UseQueryOptions, UseQueryResult } from '@tanstack/preact-query'
 */

import { useMemo } from 'preact/hooks'
import { useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useLSP } from './useLSP.js'

/**
 * @typedef {object} BillingData
 * @property {boolean} active
 * @property {{ provider: string | null, display_name: string | null, status: string | null, current_period_end: string | null, cancel_at: string | null, cancel_at_period_end: boolean, trial_end: string | null, payment_method: { brand: string | null, last4: string | null } | null }} subscription
 * @property {{ bookmarks_this_month: number, bookmarks_limit: number | null, window_start: string, window_end: string }} usage
 */

/**
 * @param {{ enabled: boolean }} params
 */
export function useBilling ({ enabled }) {
  const state = useLSP()

  const queryKey = useMemo(() => ([
    'billing',
    state.apiUrl,
  ]), [state.apiUrl])

  /** @type {UseQueryResult<BillingData, Error>} */
  const query = useTanstackQuery(/** @type {UseQueryOptions<BillingData, Error>} */ ({
    queryKey,
    enabled,
    /**
     * @param {{ signal: AbortSignal }} context
     * @returns {Promise<BillingData>}
     */
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/billing/`, {
        method: 'get',
        headers: { accept: 'application/json' },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        return /** @type {BillingData} */ (await response.json())
      }
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
  }))

  return query
}
