/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useEffect, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { useFlags } from '../../hooks/useFlags.js'

/**
 * @typedef {object} BillingData
 * @property {boolean} active
 * @property {{ provider: string | null, display_name: string | null, status: string | null, current_period_end: string | null, cancel_at: string | null, cancel_at_period_end: boolean, trial_end: string | null, payment_method: { brand: string | null, last4: string | null } | null }} subscription
 * @property {{ bookmarks_this_month: number, bookmarks_limit: number | null, window_start: string, window_end: string }} usage
 */

/** @type {FunctionComponent} */
export const BillingField = () => {
  const state = useLSP()
  const { flags } = useFlags()
  const [billing, setBilling] = useState(/** @type {BillingData | null} */(null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [actionLoading, setActionLoading] = useState(false)
  const [notice, setNotice] = useState(/** @type {string | null} */(null))

  const fetchBilling = useCallback(async () => {
    const response = await fetch(`${state.apiUrl}/billing/`, {
      method: 'get',
      headers: { accept: 'application/json' },
    })
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      return /** @type {BillingData} */ (await response.json())
    }
    throw new Error(`${response.status} ${response.statusText}`)
  }, [state.apiUrl])

  useEffect(() => {
    if (!flags?.['billing_enabled']) {
      setLoading(false)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const billingParam = params.get('billing')

    const load = async () => {
      try {
        if (billingParam === 'success') {
          await fetch(`${state.apiUrl}/billing/sync`, { method: 'post' })
        }

        const data = await fetchBilling()
        setBilling(data)

        if (billingParam === 'success') {
          setNotice('Subscription activated.')
        } else if (billingParam === 'cancel') {
          setNotice('Checkout canceled.')
        }

        if (billingParam) {
          params.delete('billing')
          const qs = params.toString()
          const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`
          window.history.replaceState(null, '', newUrl)
        }
      } catch (err) {
        setError(/** @type {Error} */(err))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [state.apiUrl, flags?.['billing_enabled'], fetchBilling])

  const handleCheckout = useCallback(async (/** @type {Event} */ ev) => {
    ev.preventDefault()
    setActionLoading(true)
    setError(null)
    try {
      const response = await fetch(`${state.apiUrl}/billing/checkout`, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
      })
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json()
        window.location.href = data.url
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    } catch (err) {
      setActionLoading(false)
      setError(/** @type {Error} */(err))
    }
  }, [state.apiUrl])

  const handlePortal = useCallback(async (/** @type {Event} */ ev) => {
    ev.preventDefault()
    setActionLoading(true)
    setError(null)
    try {
      const response = await fetch(`${state.apiUrl}/billing/portal`, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
      })
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json()
        window.location.href = data.url
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    } catch (err) {
      setActionLoading(false)
      setError(/** @type {Error} */(err))
    }
  }, [state.apiUrl])

  if (!flags?.['billing_enabled']) return null
  if (loading) return html`<dt>Billing</dt><dd>Loading...</dd>`

  const isActive = billing?.active ?? false
  const isCanceling = isActive && billing?.subscription?.cancel_at_period_end
  const isPendingSettlement = billing?.subscription?.provider === 'stripe' &&
    billing?.subscription?.status === 'active' &&
    !isActive
  const isStripe = billing?.subscription?.provider === 'stripe'
  const isCustom = billing?.subscription?.provider === 'custom'
  const pm = billing?.subscription?.payment_method
  const displayName = billing?.subscription?.display_name

  const planLabel = isActive
    ? isCustom && displayName
      ? `Paid (${displayName})`
      : 'Paid (yearly)'
    : 'Free'

  return html`
    <dt>Billing</dt>
    <dd>
      ${notice ? html`<div class="bc-help-text">${notice}</div>` : null}
      ${error ? html`<div class="error-box">${error.message}</div>` : null}

      <div>
        <strong>Plan:</strong> ${planLabel}
      </div>

      ${isActive && !isCanceling
? html`
        <div>
          <strong>Status:</strong> ${billing?.subscription?.status === 'trialing' ? 'Trialing' : 'Active'}
        </div>
        ${billing?.subscription?.current_period_end
? html`
          <div>
            <strong>${isCustom ? 'Valid until:' : 'Renews:'}</strong> ${new Date(billing.subscription.current_period_end).toLocaleDateString()}
          </div>
        `
: isCustom ? html`<div><strong>Duration:</strong> Lifetime</div>` : null}
        ${pm
? html`
          <div>
            <strong>Payment:</strong> ${pm.brand} ending in ${pm.last4}
          </div>
        `
: null}
        ${isStripe
? html`
          <div class="button-cluster">
            <button type="button" disabled=${actionLoading} onClick=${handlePortal}>Manage billing</button>
          </div>
        `
: null}
      `
: null}

      ${isCanceling
? html`
        <div>
          <strong>Status:</strong> Cancels at end of period
        </div>
        ${billing?.subscription?.current_period_end
? html`
          <div>
            <strong>Access until:</strong> ${new Date(billing.subscription.current_period_end).toLocaleDateString()}
          </div>
        `
: null}
        ${isStripe
? html`
          <div class="button-cluster">
            <button type="button" disabled=${actionLoading} onClick=${handlePortal}>Manage billing</button>
          </div>
        `
: null}
      `
: null}

      ${isPendingSettlement
? html`
        <div>
          <strong>Status:</strong> Pending settlement
        </div>
        <div class="bc-help-text">Payment is processing. Paid access unlocks after settlement confirmation.</div>
        ${isStripe
? html`
          <div class="button-cluster">
            <button type="button" disabled=${actionLoading} onClick=${handlePortal}>Manage billing</button>
          </div>
        `
: null}
      `
: null}

      ${!isActive
? html`
        ${billing?.usage
? html`
          <div>
            <strong>Usage:</strong> ${billing.usage.bookmarks_this_month} of ${billing.usage.bookmarks_limit} bookmarks this month
          </div>
        `
: null}
        ${!isPendingSettlement
? html`
          <div class="button-cluster">
            <button type="button" disabled=${actionLoading} onClick=${handleCheckout}>Subscribe</button>
          </div>
        `
: null}
      `
: null}
    </dd>
  `
}
