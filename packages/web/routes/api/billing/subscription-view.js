/**
 * @typedef {object} SubscriptionJoinedRow
 * @property {string} id
 * @property {string} user_id
 * @property {'stripe' | 'custom'} provider
 * @property {Date} created_at
 * @property {Date | null} updated_at
 * @property {string | null} stripe_status
 * @property {string | null} stripe_plan_code
 * @property {Date | null} stripe_current_period_start
 * @property {Date | null} stripe_current_period_end
 * @property {Date | null} stripe_cancel_at
 * @property {boolean | null} stripe_cancel_at_period_end
 * @property {Date | null} stripe_trial_end
 * @property {string | null} payment_method_brand
 * @property {string | null} payment_method_last4
 * @property {string | null} stripe_latest_invoice_status
 * @property {Date | null} stripe_latest_invoice_paid_at
 * @property {boolean | null} stripe_latest_invoice_settled
 * @property {string | null} custom_status
 * @property {string | null} custom_plan_code
 * @property {string | null} custom_display_name
 * @property {Date | null} custom_current_period_start
 * @property {Date | null} custom_current_period_end
 */

/**
 * Abstract base class for normalized subscription view models.
 * Provides a consistent interface across billing providers.
 */
export class SubscriptionView {
  /**
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.user_id
   * @param {'stripe' | 'custom'} params.provider
   * @param {string | null} params.status
   * @param {string | null} params.plan_code
   * @param {string | null} params.display_name
   * @param {Date | null} params.current_period_start
   * @param {Date | null} params.current_period_end
   * @param {Date | null} params.cancel_at
   * @param {boolean} params.cancel_at_period_end
   * @param {Date | null} params.trial_end
   * @param {string | null} params.payment_method_brand
   * @param {string | null} params.payment_method_last4
   * @param {string | null} params.latest_invoice_status
   * @param {Date | null} params.latest_invoice_paid_at
   * @param {boolean | null} params.latest_invoice_settled
   * @param {Date} params.created_at
   * @param {Date | null} params.updated_at
   */
  constructor (params) {
    this.id = params.id
    this.user_id = params.user_id
    this.provider = params.provider
    this.status = params.status
    this.plan_code = params.plan_code
    this.display_name = params.display_name
    this.current_period_start = params.current_period_start
    this.current_period_end = params.current_period_end
    this.cancel_at = params.cancel_at
    this.cancel_at_period_end = params.cancel_at_period_end
    this.trial_end = params.trial_end
    this.payment_method_brand = params.payment_method_brand
    this.payment_method_last4 = params.payment_method_last4
    this.latest_invoice_status = params.latest_invoice_status
    this.latest_invoice_paid_at = params.latest_invoice_paid_at
    this.latest_invoice_settled = params.latest_invoice_settled
    this.created_at = params.created_at
    this.updated_at = params.updated_at
  }

  /**
   * Returns true if this subscription grants active paid access.
   * Subclasses override this with provider-specific logic.
   * @param {Date} [now]
   * @returns {boolean}
   */
  isActive (now = new Date()) {
    const activeStatuses = new Set(['active', 'trialing'])
    if (!this.status || !activeStatuses.has(this.status)) return false
    if (this.current_period_end && this.current_period_end <= now) return false
    if (this.cancel_at && this.cancel_at <= now) return false
    return true
  }

  /**
   * @param {SubscriptionJoinedRow | undefined} row
   * @returns {StripeSubscriptionView | CustomSubscriptionView | undefined}
   */
  static fromJoinedRow (row) {
    if (!row) return undefined
    if (row.provider === 'stripe') return StripeSubscriptionView.fromRow(row)
    return CustomSubscriptionView.fromRow(row)
  }
}

/**
 * Subscription view for Stripe-managed subscriptions.
 * Adds invoice-settled check to isActive().
 */
export class StripeSubscriptionView extends SubscriptionView {
  /**
   * @param {SubscriptionJoinedRow} row
   * @returns {StripeSubscriptionView}
   */
  static fromRow (row) {
    return new StripeSubscriptionView({
      id: row.id,
      user_id: row.user_id,
      provider: row.provider,
      status: row.stripe_status,
      plan_code: row.stripe_plan_code,
      display_name: null,
      current_period_start: row.stripe_current_period_start,
      current_period_end: row.stripe_current_period_end,
      cancel_at: row.stripe_cancel_at,
      cancel_at_period_end: row.stripe_cancel_at_period_end ?? false,
      trial_end: row.stripe_trial_end,
      payment_method_brand: row.payment_method_brand,
      payment_method_last4: row.payment_method_last4,
      latest_invoice_status: row.stripe_latest_invoice_status,
      latest_invoice_paid_at: row.stripe_latest_invoice_paid_at,
      latest_invoice_settled: row.stripe_latest_invoice_settled,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
  }

  /**
   * @override
   * @param {Date} [now]
   * @returns {boolean}
   */
  isActive (now = new Date()) {
    if (this.status === 'active' && !this.latest_invoice_settled) return false
    return super.isActive(now)
  }
}

/**
 * Subscription view for manually-managed custom subscriptions.
 */
export class CustomSubscriptionView extends SubscriptionView {
  /**
   * @param {SubscriptionJoinedRow} row
   * @returns {CustomSubscriptionView}
   */
  static fromRow (row) {
    return new CustomSubscriptionView({
      id: row.id,
      user_id: row.user_id,
      provider: row.provider,
      status: row.custom_status,
      plan_code: row.custom_plan_code,
      display_name: row.custom_display_name,
      current_period_start: row.custom_current_period_start,
      current_period_end: row.custom_current_period_end,
      cancel_at: null,
      cancel_at_period_end: false,
      trial_end: null,
      payment_method_brand: null,
      payment_method_last4: null,
      latest_invoice_status: null,
      latest_invoice_paid_at: null,
      latest_invoice_settled: null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
  }
}
