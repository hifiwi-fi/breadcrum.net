/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useEffect, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { useFlags } from '../../hooks/useFlags.js'
import { useBilling } from '../../hooks/useBilling.js'
import { useSearchParams } from '../../hooks/useSearchParams.js'

/**
 * @param {string} apiUrl
 * @param {ReturnType<typeof useBilling>['refetch']} refetch
 * @returns {Promise<string>}
 */
export async function syncCheckoutBilling (apiUrl, refetch) {
  const response = await fetch(`${apiUrl}/billing/sync`, {
    method: 'post',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
  }
  const result = await refetch({ throwOnError: true })
  if (result.isError) throw result.error
  if (!result.data) throw new Error('Unable to refresh subscription status.')
  return result.data.active
    ? 'Subscription activated.'
    : 'Checkout completed. Paid access is pending confirmation.'
}

/** @type {FunctionComponent} */
export const BillingField = () => {
  const state = useLSP()
  const { flags } = useFlags()
  const billingEnabled = Boolean(flags?.['billing_enabled'])
  const { params, setParams } = useSearchParams(['billing'])
  const billingParam = params['billing']
  const { data: billing, isPending: billingLoading, error: billingError, refetch } = useBilling({
    enabled: true,
  })

  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [actionLoading, setActionLoading] = useState(false)
  const [notice, setNotice] = useState(/** @type {string | null} */(null))

  const clearBillingParam = useCallback(() => {
    if (typeof window === 'undefined' || !billingParam) return
    setParams({ billing: null })
  }, [billingParam, setParams])

  useEffect(() => {
    if (!billingParam) return

    const load = async () => {
      try {
        if (billingParam === 'success') {
          setError(null)
          setNotice(null)
          setNotice(await syncCheckoutBilling(state.apiUrl, refetch))
        } else if (billingParam === 'cancel') {
          setNotice('Checkout canceled.')
        }
      } catch (err) {
        setNotice('Checkout returned, but subscription activation could not be confirmed. Please refresh to check your billing status.')
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

  const feedback = html`
    ${notice ? html`<div class="bc-help-text">${notice}</div>` : null}
    ${error || billingError ? html`<div class="error-box">${(error || billingError)?.message}</div>` : null}
  `
  if (!billingEnabled && billingLoading) return null
  if (billingLoading) return html`<dt>Billing</dt><dd>${feedback}Loading...</dd>`
  if (!billing) return billingEnabled ? html`<dt>Billing</dt><dd>${feedback}Unavailable</dd>` : null
  if (!billingEnabled && !billing.subscription.provider) return null

  const isActive = billing?.active ?? false
  const isCanceling = isActive && billing?.subscription?.cancel_at_period_end
  const subscriptionStatus = billing?.subscription?.status
  const isPendingSettlement = billing?.subscription?.provider === 'stripe' &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') &&
    !isActive
  const isStripe = billing?.subscription?.provider === 'stripe'
  const isCustom = billing?.subscription?.provider === 'custom'
  const needsStripeManagement = isStripe && Boolean(subscriptionStatus) &&
    !['canceled', 'incomplete_expired'].includes(/** @type {string} */ (subscriptionStatus))
  const pm = billing?.subscription?.payment_method
  const displayName = billing?.subscription?.display_name

  const planLabel = isActive
    ? isCustom && displayName
      ? `Paid (${displayName})`
      : 'Paid (yearly)'
    : isPendingSettlement
      ? 'Paid (pending settlement)'
      : 'Free'

  return html`
    <dt>Billing</dt>
    <dd>
      ${feedback}

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
        ${needsStripeManagement && !isPendingSettlement
? html`
          <div class="button-cluster">
            <button type="button" disabled=${actionLoading} onClick=${handlePortal}>Manage billing</button>
          </div>
        `
: null}
        ${billing?.usage
? html`
          <div>
            <strong>Usage:</strong> ${billing.usage.bookmarks_this_month} of ${billing.usage.bookmarks_limit} bookmarks this month
          </div>
        `
: null}
        ${billingEnabled && !isPendingSettlement && !needsStripeManagement
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
