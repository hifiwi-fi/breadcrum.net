# Issue 177 Plan: Subscriptions and Billing

## Reference implementation
Based on [t3dotgg/stripe-recommendations](https://github.com/t3dotgg/stripe-recommendations/blob/main/README.md) ([video walkthrough](https://www.youtube.com/watch?v=Wdyndb17K58)), [Stripe lookup keys docs](https://docs.stripe.com/products-prices/manage-prices?dashboard-or-api=api#lookup-keys), and Stripe docs for Checkout fulfillment / delayed payment methods.

Key principles:
- A single `syncStripeSubscription(customerId)` function fetches current state from Stripe and upserts DB rows. It is called from webhooks, success-flow sync, and admin manual sync.
- Use idempotency keys (user ID) when creating Stripe customers to avoid duplicate-customer races.
- Read period dates from `subscription.items.data[0]` for current Stripe API compatibility.
- Use lookup keys (`yearly_paid`) instead of hardcoded price IDs.
- Keep entitlement settlement-driven for delayed-notification payment methods (for Stripe: require paid invoice settlement before unlocking active paid access).
- Handle async checkout webhook outcomes (`checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`) explicitly.

## Current progress (2026-02-16)
- ✅ Phase 1 complete: Migration `030.do.billing.sql` uses supertype + subtype model with 4 billing tables (`subscriptions`, `stripe_customers`, `stripe_subscriptions`, `custom_subscriptions`) and bookmark usage index.
- ✅ Phase 2 complete: Billing plugin + env config + feature flags (`billing_enabled`, `subscriptions_required`).
- ✅ Phase 2 complete: `/api/billing` routes implemented (`GET /`, `POST /checkout`, `POST /portal`, `POST /sync`, `POST /webhook`).
- ✅ Phase 2 complete: Route-scoped webhook parser implemented under `routes/api/billing/webhook/` so raw-body parsing does not affect non-webhook billing routes.
- ✅ Phase 2 complete: `syncStripeSubscription()` implemented in `@breadcrum/resources/billing/sync.js`.
- ✅ Phase 2 complete: Webhook handler enqueues `sync-subscription` queue (throttled by customer ID) and handles 18 allowed Stripe event types.
- ✅ Phase 2 complete: Idempotency key on `stripe.customers.create(...)`.
- ✅ Phase 2 complete: Checkout resolves price via lookup key (`STRIPE_PRICE_LOOKUP_KEY`) at request time.
- ✅ Phase 2 complete: Payment method details (brand + last4) stored in Stripe subtype table and shown in account billing UI.
- ✅ Phase 2 complete: Generic subscription join + `SubscriptionView` normalizes Stripe/custom provider rows to a uniform app interface.
- ✅ Phase 2 complete: Settlement-driven access for Stripe (`status=active` is not enough; latest invoice must be settled).
- ✅ Phase 2 complete: Webhook async outcome messaging sends transactional emails for delayed success/failure and still syncs subscription state.
- ✅ Phase 2 complete: Quota enforcement on bookmark create when `subscriptions_required` is enabled.
- ✅ Phase 3 complete: Account billing UI supports free/paid state, pending settlement state, custom provider labels, usage display, subscribe/manage actions, and success/cancel return handling.
- ✅ Phase 3 complete: Marketing page updated for free + paid plans.
- ✅ Phase 4 complete: Admin UI shows provider/status/plan/display/period end/canceling + Stripe customer link.
- ✅ Phase 4 complete: Admin custom subscription management (`PUT/DELETE /api/admin/users/:id/subscription`) with unlimited (no-expiration) checkbox and date input disable behavior.
- ✅ Phase 4 complete: Admin “Sync from Stripe” action (`POST /api/admin/users/:id/sync`).
- ✅ Phase 4 complete: Admin user deletion cancels Stripe subscriptions and deletes Stripe customer before deleting user row.
- ✅ Phase 5 complete: Shared billing code moved to `@breadcrum/resources/billing/`; sync queue and worker are active.
- ⚠️ Phase 6 pending: Billing API/webhook tests are still TODO-heavy.

## Context (current architecture)
- Web: Fastify routes under `packages/web/routes`, Postgres via `@fastify/postgres`, schemas in `routes/**/schemas`, SQL via `@nearform/sql`.
- Client: Preact + HTM under `packages/web/client`, account settings under `client/account`.
- Auth: JWT with `verifyJWT` + `notDisabled` where required.
- Worker: pg-boss workers in `packages/worker`, including billing sync worker.
- Migrations: Postgrator SQL in `packages/web/migrations`.
- Admin: User list/edit under `routes/api/admin/users` and `client/admin`.

## Goals
- Support paid subscriptions with clear active/inactive semantics.
- Provide Stripe checkout/portal/webhook flows and durable subscription state.
- Provide account and admin billing visibility and controls.
- Keep free plan path and gradual rollout via feature flags.

## Plan definitions (initial)
- Free plan: 10 new bookmarks per month (UTC month window).
- Paid plan: unlimited bookmarks, billed yearly.
- Paid-only features: bookmark import (when implemented).

## Non-goals (for v1)
- Multi-seat/org billing.
- Multiple payment providers in production simultaneously.
- Full invoice management in-app (provider portal remains source of truth).

## Phase 0: Product + provider decisions
- Define free vs paid benefits and pricing.
- Choose Stripe as payment provider.
- Define cancellation/refund/trial semantics.
- Define what is metered and gated by subscription status.

## Phase 1: Data model + migrations
- `subscriptions` supertype (`user_id`, `provider`) with `unique(user_id, provider)`.
- `stripe_customers` mapping (`user_id` ↔ `stripe_customer_id`).
- `stripe_subscriptions` subtype (Stripe lifecycle/payment details, latest invoice settlement fields).
- `custom_subscriptions` subtype (admin-managed grants, nullable `current_period_end` for lifetime).
- Bookmark usage index on `(owner_id, created_at)`.

## Phase 2: Backend billing integration

### Sync function (per t3dotgg)
Single sync function in `@breadcrum/resources/billing/sync.js`:
- Calls `stripe.subscriptions.list({ customer, limit: 1, expand: [...] })`.
- Upserts `subscriptions` supertype + `stripe_subscriptions` subtype.
- Reads period dates from `subscription.items.data[0]`.
- Captures latest invoice status and settlement signal.
- Called from webhook-triggered queue, user success sync endpoint, and admin manual sync endpoint.

### Payment method storage
- Card brand + last4 stored in `stripe_subscriptions`.
- Surfaced through normalized subscription view and account billing UI.

### Lookup keys for price resolution
- `STRIPE_PRICE_LOOKUP_KEY` (`yearly_paid`) resolves Stripe Price at checkout time.
- No hardcoded price IDs in app config.

### Env config
- `BILLING_ENABLED`
- `BILLING_PROVIDER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_LOOKUP_KEY`

### Billing plugin
- `plugins/billing.js` initializes Stripe SDK and decorates `fastify.billing`.

### API routes (`routes/api/billing/`)
- `GET /api/billing/` returns plan, normalized subscription summary, and usage.
- `POST /api/billing/checkout` ensures customer mapping, resolves price by lookup key, creates checkout session.
- `POST /api/billing/portal` creates customer portal session.
- `POST /api/billing/sync` syncs current user from Stripe.
- `POST /api/billing/webhook` verifies signature, enqueues sync, and sends async outcome messaging.

### Webhook events handled
Events trigger subscription sync when customer ID is present:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `customer.subscription.pending_update_applied`
- `customer.subscription.pending_update_expired`
- `customer.subscription.trial_will_end`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.payment_succeeded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Additional behavior for delayed-notification methods:
- On `checkout.session.async_payment_succeeded` (subscription mode), send transactional success email and sync as usual.
- On `checkout.session.async_payment_failed` (subscription mode), send transactional failure email and sync as usual.

### Quota enforcement
- On bookmark create (`PUT /api/bookmarks/`), if `subscriptions_required` is true:
  - If active subscription, allow unlimited.
  - Otherwise enforce free monthly bookmark cap and return `402` when exceeded.
- Stripe active entitlement is settlement-driven (latest invoice must be settled).

### Feature flags
- `billing_enabled` (frontend + backend): billing routes/UI availability.
- `subscriptions_required` (backend): quota enforcement activation.

## Phase 3: Client UI
- Account billing section implemented:
  - Current plan, status, renewal/valid-until, payment method.
  - Pending settlement state messaging for delayed methods.
  - “Subscribe” and “Manage billing” actions.
  - Return-flow handling for `?billing=success` / `?billing=cancel`.
- Marketing page updated to show free vs paid plans.

## Phase 4: Admin + ops
- Admin user read model includes billing fields: provider/status/plan/display_name/period/canceling/stripe_customer_id.
- Admin subscription management:
  - `PUT /api/admin/users/:id/subscription` create/update custom grant.
  - `DELETE /api/admin/users/:id/subscription` remove custom grant.
  - Unlimited (no expiration) checkbox supported for custom grants.
- Admin Stripe sync endpoint:
  - `POST /api/admin/users/:id/sync`.
- Admin user deletion lifecycle:
  - Cancel Stripe subscriptions and delete Stripe customer before DB user delete.

## Phase 5: Sync infrastructure
- Shared billing code: `@breadcrum/resources/billing/*`.
- Queue: `sync-subscription` with customer-based throttling window and retry/backoff.
- Worker consumes sync jobs and runs central Stripe sync function.
- User-initiated sync on checkout return + admin manual sync path.

## Phase 6: Tests + observability
- Billing tests still largely TODO; required:
  - Checkout/portal/sync API behavior.
  - Webhook signature and queue enqueue behavior.
  - Async success/failure webhook email behavior.
  - Settlement-driven entitlement behavior.
- Add/expand billing metrics and alerting.

## Stripe API keys (development vs production)

Stripe keys are mode-isolated. Test and live have separate products/prices/customers/webhooks.

- **Test mode keys** (`sk_test_...`): local/staging usage.
- **Live mode keys** (`sk_live_...`): production usage.

### Env vars by environment

| Env var | Development / Staging | Production |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (test endpoint) | `whsec_...` (live endpoint) |
| `STRIPE_PRICE_LOOKUP_KEY` | `yearly_paid` | `yearly_paid` |

`STRIPE_PRICE_LOOKUP_KEY` stays the same string across environments but resolves to environment-specific price objects.

### Webhook endpoints

Register separate test/live endpoints in Stripe dashboard:
- Test mode: local/staging (`/api/billing/webhook`).
- Live mode: production (`/api/billing/webhook`).

For local dev, use Stripe CLI forwarding (already scripted):
- `pnpm run --filter @breadcrum/web watch:stripe-webhook`

### Setup checklist
- [x] Create Stripe product + yearly price in **test mode** and assign `yearly_paid` lookup key.
- [ ] Create Stripe product + yearly price in **live mode** and assign `yearly_paid` lookup key.
- [x] Set test-mode Stripe keys in local dev env files (web + worker).
- [ ] Set production live-mode Stripe keys in production secrets.
- [x] Run Stripe CLI webhook forwarding for local development.
- [ ] Register persistent test/staging webhook endpoint in Stripe dashboard.
- [ ] Register persistent production webhook endpoint in Stripe dashboard.

## Stripe dashboard configuration (manual)
- [ ] Enable “Limit customers to one subscription”.
- [ ] Confirm enabled/disabled payment methods policy (ACH Direct Debit, Cash App Pay, Amazon Pay, etc.).
- [x] Assign lookup key `yearly_paid` to yearly subscription price in test mode.
- [ ] Assign lookup key `yearly_paid` to yearly subscription price in live mode.

## User deletion lifecycle (implemented)

Admin `DELETE /api/admin/users/:id` behavior:
- Looks up Stripe customer mapping.
- Cancels all non-canceled Stripe subscriptions for that customer.
- Deletes Stripe customer.
- Deletes user row in app DB (cascade removes local billing rows).
- Stripe `resource_missing` errors are treated as already-cleaned state; other Stripe failures block deletion.

## Next steps (short-term)
1. Implement billing API/webhook tests (including async success/failure email cases).
2. Add webhook event-id dedupe strategy for notification side effects (prevent duplicate async emails on webhook retries).
3. Finalize Stripe dashboard payment-method configuration and persistent webhook endpoints.
4. Prepare production secrets + live-mode product/price setup.

## Rollout plan
- Keep `billing_enabled`/`subscriptions_required` as rollout controls.
- Validate staging end-to-end with Stripe test mode and delayed payment scenarios.
- Promote to production with live keys and live webhook endpoint.
- Monitor sync queue, webhook failures, and payment failure rates after launch.

## Open questions
- Trial/grace period policy for failed renewals?
- Should we persist additional Stripe invoice/payment records locally, or continue to rely on provider portal + normalized subscription summary?
- Should async outcome emails have user-level opt-out, or always transactional/no-opt-out?
