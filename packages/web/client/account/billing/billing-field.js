/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useEffect, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { useFlags } from '../../hooks/useFlags.js'
import { useBilling } from '../../hooks/useBilling.js'
import { useSearchParams } from '../../hooks/useQuery.js'

/** @type {FunctionComponent} */
export const BillingField = () => {
  const state = useLSP()
  const { flags } = useFlags()
  const billingEnabled = Boolean(flags?.['billing_enabled'])
  const { searchParams, replaceState } = useSearchParams(/** @type {{ billing?: string } | null} */ (null))
  const billingParam = searchParams?.billing ?? null
  const { data: billing, isPending: billingLoading, error: billingError, refetch } = useBilling({
    enabled: billingEnabled,
  })

  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [actionLoading, setActionLoading] = useState(false)
  const [notice, setNotice] = useState(/** @type {string | null} */(null))

  const clearBillingParam = useCallback(() => {
    if (typeof window === 'undefined' || !billingParam) return
    const params = new URLSearchParams(window.location.search)
    params.delete('billing')
    const qs = params.toString()
    const nextUrl = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`
    replaceState(nextUrl)
  }, [billingParam, replaceState])

  useEffect(() => {
    if (!billingEnabled || !billingParam) return

    const load = async () => {
      try {
        if (billingParam === 'success') {
          await fetch(`${state.apiUrl}/billing/sync`, { method: 'post' })
          await refetch()
          setNotice('Subscription activated.')
        } else if (billingParam === 'cancel') {
          setNotice('Checkout canceled.')
        }
      } catch (err) {
        setError(/** @type {Error} */(err))
      }
      clearBillingParam()
    }

    load()
  }, [billingEnabled, billingParam, clearBillingParam, refetch, state.apiUrl])

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
        // Stripe Checkout redirect. User returns to /account/ with billing=success|cancel.
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

  if (!billingEnabled) return null
  if (billingLoading) return html`<dt>Billing</dt><dd>Loading...</dd>`
  if (!billing) return html`<dt>Billing</dt><dd>Unavailable</dd>`

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
      ${error || billingError ? html`<div class="error-box">${(error || billingError)?.message}</div>` : null}

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
