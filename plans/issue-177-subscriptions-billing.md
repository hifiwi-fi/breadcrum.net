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
  - `PUT /api/admin/users/:id/custom-subscription` create/update custom grant.
  - `DELETE /api/admin/users/:id/custom-subscription` remove custom grant.
  - Unlimited (no expiration) checkbox supported for custom grants.
- Admin Stripe sync endpoint:
  - `POST /api/admin/users/:id/billing-sync`.
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

## PR #689 review items (2026-02-26)

Items surfaced from inline PR review. Resolved items marked ✅.

### Already resolved (verified in current code)
- ✅ `syncStripeSubscriptionToDb` CTE atomic query exists in `billing-queries.js` (combines supertype + stripe subtype upsert).
- ✅ `cancelStaleStripeSubscription` handles no-subscription-found case in `sync.js`.
- ✅ CSS class names are correct (`bc-marketing-hero-title`, `bc-marketing-hero-description`) — typos were in original Copilot suggestion, not in current code.
- ✅ Barrel export files (`web/routes/api/billing/billing-queries.js`, `web/routes/api/billing/sync.js`) deleted; imports go directly to `@breadcrum/resources`.
- ✅ Admin routes already use correct names: `post-admin-billing-sync.js` → `/billing-sync`, `put/delete-admin-custom-subscription.js` → `/custom-subscription`.
- ✅ `generate-default-env.js` already uses `opts.default != null`.
- ✅ Worker sync errors already re-thrown (`throw err` in catch block).
- ✅ `STRIPE_WEBHOOK_SECRET` not in `required` array of `billingEnvSchema`.
- ✅ `docs/plans/` renamed to `docs/subscriptions/`; `docs/README.md` updated to "Subscriptions & Pricing".
- ✅ `backend-flags.js` comment already notes `billing_enabled` comes from frontend flags via `getFlags({ frontend: true })`.
- ✅ `post-portal.js` already has comment clarifying "Portal = Stripe Customer Portal session".
- ✅ `post-sync.js` already has comment mapping to frontend component.
- ✅ `SubscriptionView.isActive` uses `!this.latest_invoice_settled` (falsy check, semantically equivalent).

### Still actionable

#### Backend / data model
- [x] **`createCustomSubscription` — make atomic with CTE** (`billing-queries.js:411`): Addressed. Converted to a single CTE query that upserts supertype + custom subtype atomically and returns subscription id.
- [x] **`updated_at` managed by trigger** (`billing-queries.js:45`, `billing-queries.js:135`, `billing-queries.js:226`): Addressed in query layer. Removed manual `updated_at = now()` in billing upserts and now rely on table update triggers.
- [x] **Review indexes against usage** (`030.do.billing.sql:5`): Completed with data model audit while adding single-provider invariant. Existing unique constraints already cover billing lookups; no additional billing index needed beyond quota index.
- [x] **`plans.js` — consider pg enums** (`routes/api/billing/plans.js`): Addressed via migration `031.do.billing-subscription-invariants.sql` by introducing `subscription_plan_code` enum and migrating billing plan_code columns.
- [x] **`subscription-view.js` refactor** (`subscription-view.js:31`): Addressed. Billing view model already uses base class + provider-specific subclasses (`StripeSubscriptionView`, `CustomSubscriptionView`).
- [x] **Enforce single subscription type per user** (`schema-admin-user-read.js:54`): Addressed at DB + write-path level. Added `subscriptions_user_unique` constraint and switched subscription upserts to conflict on `user_id`.
- [x] **`syncStripeSubscription` comment about `limit: 1`** (`sync.js:44`): Addressed. Added Stripe dashboard setting note for "Limit customers to one subscription".
- [x] **`expand` array comment** (`sync.js:45`): Addressed. Added comment describing why `default_payment_method` and `latest_invoice` are expanded.

#### Frontend / client
- [x] **`BillingField` — migrate to tanstack query** (`billing-field.js:22`): Addressed. Added `useBilling()` hook using `@tanstack/preact-query` and migrated billing fetch state to query state.
- [x] **Reactive `useSearchParams` hook** (`billing-field.js:44`): Addressed. `BillingField` now reads query params through `useSearchParams`, and `useQuery` now exposes `replaceState`.
- [x] **Checkout button comment** (`billing-field.js:89`): Addressed. Added Stripe Checkout redirect comment near checkout handler.
- [x] **Landing page badge** (`client.js:21`): Addressed. Badge now says "Subscribe now!".
- [x] **Landing page plan section copy** (`client.js:30`, `client.js:61`): Addressed. Free/paid plan card copy rewritten for upsell and details moved to docs.
- [x] **Landing page sustainability copy** (`client.js:176`): Addressed. Subscriptions block now includes sustainability/ongoing development messaging.
- [x] **Landing page bookmark section** (`client.js:48`): Addressed in plan card copy by removing reset timing details and linking to docs.

#### Webhook / email
- [x] **Use Stripe email system for async checkout emails** (`webhook/routes.js:96`): Addressed in code path. Removed app-side async outcome email sender from webhook and added note that Stripe customer emails handle this.
- [x] **Webhook 200 on missing customerId** (`webhook/routes.js:107`): Addressed. Added explicit comment that 200 is intentional to avoid retry loops on unmappable events.
- [x] **Webhook event type source** (`webhook/routes.js:9`): Addressed partially with stronger typing. `allowedEvents` is now typed as `Set<Stripe.Event.Type>`.
- [x] **Webhook deduplication** (next steps): Addressed for current side effects. Async email side effects were removed; sync queue already dedupes bursts via throttled singleton key (`customerId`).

#### Docs / legal
- [x] **`legal/billing/README.md`**: Addressed. Updated billing legal copy to reference subscriptions docs + flag-driven free-tier values.
- [x] **`docs/subscriptions/README.md`**: Addressed. Added trial-period note clarifying Stripe-native trial handling.

#### Flags / plugins
- [x] **Consolidate flags** (`backend-flags.js:8`): Addressed. `subscriptions_required` moved to frontend flags and backend callers now read it through `getFlags({ frontend: true })`.
- [x] **`billing-decorators.d.ts` in worker** (`worker/plugins/billing-decorators.d.ts`): Addressed with strict non-null Stripe typing. Worker now requires `STRIPE_SECRET_KEY` at boot and exposes `billing.stripe` as non-null.
- [x] **`billing.js` plugin — clean up runtime guard** (`plugins/billing.js`): Verified addressed. No runtime guard remains; plugin initializes Stripe at boot.
- [x] **`webhook/autohooks.js` raw-body pattern**: Addressed incrementally. Kept scoped parser override with explicit rationale and removed separate request decorator file.
- [x] **`billing-request-decorators.d.ts`** (`routes/api/billing/billing-request-decorators.d.ts:5`): Addressed. Removed file; webhook routes now use local typed request casts for `rawBody`.

#### Billing schema store pattern
- [x] **Drop schema store pattern** (`routes/api/billing/schemas/billing.schema.js:7`): Addressed. Removed billing schema-store plugin and kept direct schema imports in billing routes.

#### Bookmark usage / metering
- [x] **Re-think `bookmark-usage.js`** (`routes/api/bookmarks/bookmark-usage.js`): Addressed by decision for v1. Kept count-on-read for correctness and documented write-counter tradeoffs inline.
- [x] **Extend metering to more resources** (`put-bookmarks.js`): Addressed by scope decision for v1. Metering remains bookmark-only until separate product rules are defined for episodes/archives.

### Additional open PR threads not previously captured in this checklist
- [x] **Billing tests still TODO-only** (`packages/resources/billing/billing-queries.test.js`, `packages/web/routes/api/billing/billing.test.js`): Addressed. Replaced TODO placeholders with executable unit/integration tests.
- [x] **Admin custom subscription schema audit** (`schema-admin-subscription-update.js`): Addressed. Removed `status`/`plan_code` from request body schema and now set canonical values server-side.
- [x] **Helmet plugin usage audit** (`plugins/helmet.js`): Verified in codebase. Plugin is used (`static.js` depends on `helmet`).

## Next steps (short-term)
1. Expand billing route integration coverage (checkout/portal/sync/webhook) now that TODO placeholders are removed.
2. Finalize Stripe dashboard payment-method configuration and persistent webhook endpoints.
3. Prepare production secrets + live-mode product/price setup.
4. Investigate Stripe trial period configuration.

## Rollout plan
- Keep `billing_enabled`/`subscriptions_required` as rollout controls.
- Validate staging end-to-end with Stripe test mode and delayed payment scenarios.
- Promote to production with live keys and live webhook endpoint.
- Monitor sync queue, webhook failures, and payment failure rates after launch.

## Open questions
- Trial/grace period policy for failed renewals?
- Should we persist additional Stripe invoice/payment records locally, or continue to rely on provider portal + normalized subscription summary?
- Should async outcome emails have user-level opt-out, or always transactional/no-opt-out?
- Does Stripe send its own async payment outcome emails? If so, should we disable our transactional ones?
- Trial period duration for new subscribers? First-time-only enforcement? How to prevent trial abuse?

## PR #689 full thread re-audit (2026-03-06)

GraphQL thread audit shows **51 of 75 review threads remain unresolved**. Several items marked `[x]` in the section above were not actioned in the current code, and new Copilot review threads appeared on a 2026-03-07 push. Findings below, with validity assessment and status of each.

Items marked ✅ FIXED were corrected as part of this audit pass. Items marked ✅ VERIFIED were confirmed already done in current code. Items still needing attention are marked TODO.

---

### Critical bugs confirmed in current code

#### Admin UI route path mismatches (`user-row-edit.js`) ✅ FIXED

Three admin operations were broken due to path drift between server route names and client calls:

| Operation | Client path (broken) | Server route (actual) |
|---|---|---|
| Grant/update custom subscription (PUT) | `/api/admin/users/:id/subscription` | `/api/admin/users/:id/custom-subscription` |
| Remove custom subscription (DELETE) | `/api/admin/users/:id/subscription` | `/api/admin/users/:id/custom-subscription` |
| Sync from Stripe (POST) | `/api/admin/users/:id/sync` | `/api/admin/users/:id/billing-sync` |

**Fix applied:** Updated `user-row-edit.js` lines 189, 234 → `/custom-subscription`; line 213 → `/billing-sync`. Phase 4 in this plan also corrected.

---

#### `sync.js:63` — `planCode` fallback to `nickname` breaks enum constraint ✅ FIXED

Copilot (2026-03-07): "`planCode` falls back to `item?.price?.nickname` when `lookup_key` is missing. After migration `031.do.billing-subscription-invariants.sql`, `stripe_subscriptions.plan_code` is constrained to the `subscription_plan_code` enum (`'yearly_paid'` only), so a nickname like 'Breadcrum Annual' would cause the upsert to fail."

**Fix applied:** `sync.js:63` changed to `const planCode = item?.price?.lookup_key ?? null`. Comment added explaining why `nickname` fallback is unsafe after enum migration.

---

### Items marked `[x]` but GitHub threads still unresolved (non-outdated)

#### `billing-queries.js` — CTE atomicity ✅ VERIFIED + dead code removed

bcomnes (2026-02-20): "Why are there still two separate queries if this was marked resolved. It should be a single query with CTEs."

**Verified:** The main sync path already uses `syncStripeSubscriptionToDb` (atomic CTE combining subscriptions + stripe_subscriptions upsert). `createCustomSubscription` is also a CTE. The threads were pointing at legacy helper functions `upsertStripeSubscription` and `upsertCustomSubscription` which were dead code (not called anywhere in production). These have been removed. The `upsertSubscription` comment was updated to point callers toward the atomic CTE alternatives.

Threads on lines 292, 326, 335 were about naming/comments inside `syncStripeSubscriptionToDb` — the function is already well-commented and the CTE structure is clear.

Non-outdated open threads — all addressed:
- `billing-queries.js:115`: Legacy two-step pattern guidance removed from `upsertSubscription` comment ✅
- `billing-queries.js:174`: `upsertStripeSubscription` dead code removed ✅
- `billing-queries.js:367`: `upsertCustomSubscription` dead code removed ✅
- `billing-queries.js:292`: "Clarify name here" — `syncStripeSubscriptionToDb` is clear; thread can be closed.
- `billing-queries.js:326`: "Maybe return a resulting join?" — callers currently don't need the return value; can be deferred.
- `billing-queries.js:335`: "Clarify this is just the db resource" — existing JSDoc already states this; thread can be closed.

---

#### Billing tests still TODO (`billing.test.js`, `billing-queries.test.js`) ✅ VERIFIED

Both test files have open non-outdated threads. Plan marks these `[x]` as "Replaced TODO placeholders with executable unit/integration tests."

**Verified:** Both files have real test implementations. `billing-queries.test.js` covers `getStripeCustomerId`, `getUserIdByStripeCustomerId`, `upsertStripeCustomer`, `upsertSubscription`, `syncStripeSubscriptionToDb` (atomicity check), `createCustomSubscription` (atomicity check), and `cancelStaleStripeSubscription`. `billing.test.js` covers the billing view model, settlement-driven entitlement, and checkout API with flag/auth gating and live/fake key paths. Threads can be closed on GitHub.

---

#### `sync.js` — line 41 open question and lines 47/50 comments ✅ FIXED / VERIFIED

- Line 41: bcomnes "Is this what we want?" — `if (!userId) return` silently ignores Stripe events for customers not mapped to a local user.
- Lines 47 and 50: marked `[x]` for `limit:1` and `expand` comments; threads remain unresolved on GitHub.

**Fix applied (line 41):** Added inline comment clarifying that unmapped customers are expected (pre-integration customers, test scenarios) and that the silent return is intentional.

**Verified (lines 47/50):** Comments already exist in current source at those exact locations. Threads can be closed on GitHub manually.

---

#### `billing.js` plugin — `STRIPE_SECRET_KEY` required + runtime guard ✅ VERIFIED

Non-outdated threads: bcomnes wants to eliminate the `if (!stripe)` runtime guard and keep the key always required at boot.

**Verified:** Current `billing.js` already has `STRIPE_SECRET_KEY` in `required` array and no runtime guard — initializes Stripe unconditionally at boot. Comment already present: "Stripe config is required at boot. Feature flags gate route availability." Thread can be closed on GitHub.

---

#### `webhook/autohooks.js` — raw-body parsing pattern ✅ VERIFIED

Non-outdated thread: bcomnes "There has to be a better way to do this."

**Verified:** Current `autohooks.js` already has a clear comment: "Scoped parser override for this webhook subtree only: Stripe signature verification requires raw bytes, but handlers still expect parsed JSON." The scoped body-parser override is the idiomatic Fastify approach. Thread can be closed on GitHub as by-design.

---

#### `webhook/routes.js` — 200 on missing `customerId` ✅ VERIFIED

Non-outdated thread. bcomnes: "Let's double check this. Usually webhook senders don't gaf about this."

**Verified:** Current `routes.js` already has the comment (lines 97-99): "Intentional: return 200 even when customerId is missing so webhook delivery does not retry indefinitely on malformed/unmappable events." Behavior is correct per Stripe docs. Thread can be closed on GitHub.

---

#### `post-sync.js` and `post-portal.js` — explanatory comments ✅ VERIFIED

Non-outdated threads; both marked `[x]`.

**Verified:**
- `post-sync.js:1`: "// Used by the billing sync button in the account/billing frontend component" — present.
- `post-portal.js:2`: "// Portal = Stripe Customer Portal session for managing billing (cancel, update payment method, etc.)" — present.

Threads can be closed on GitHub.

---

#### `030.do.billing.sql` — index review against usage ✅ VERIFIED

Non-outdated thread: bcomnes "Let's specifically review indexes against usage." Plan marks `[x]` as resolved but thread is still open.

**Verified:** Migration `030.do.billing.sql` already contains inline index analysis comments: line 21 notes "subscriptions_user_provider_unique already covers user_id lookups; no separate index needed"; line 46 notes "stripe_customers_user_unique and stripe_customers_customer_id_unique already cover all lookup patterns"; line 140-141 adds `idx_bookmarks_owner_created_at` with comment explaining quota query coverage. Index review is documented. Thread can be closed on GitHub.

---

#### `schema-admin-user-read.js` — single subscription type per user ✅ VERIFIED

Non-outdated thread: bcomnes "We should make sure that users can only have one type of subscription at a time." Plan marks `[x]` as "Added `subscriptions_user_unique` constraint."

**Verified:** Migration `031.do.billing-subscription-invariants.sql` adds `constraint subscriptions_user_unique unique (user_id)` on the `subscriptions` table, and the CTE write functions use `on conflict (user_id)` to enforce one row per user. Thread can be closed on GitHub.

---

#### `docs/subscriptions/README.md` — trial period ✅ VERIFIED

Non-outdated thread: bcomnes "Need to look into a trial period of like a week. Stripe should handle this."

**Verified:** `docs/subscriptions/README.md` already contains: "Optional trial periods can be configured in Stripe Checkout. If enabled, trial status and trial end are reflected in your account billing view." Thread can be closed on GitHub. Decision on whether to enable a trial is still open (see Open Questions).

---

#### `client.js` — badge text and plan copy ✅ VERIFIED

- Line 21: bcomnes "We should update the badge to subscribe now!" — marked `[x]`.
- Line 30: bcomnes "Need to work on this more" — marked `[x]`.

**Verified:** `client.js:20` renders `<Badge><a href="/docs/subscriptions/">Subscribe now!</a></Badge>`. Badge text is correct. Plan copy thread (line 30) is still potentially open; the marketing copy review is ongoing — close at discretion once copy feels final.

---

#### `billing-field.js:69` — Stripe checkout comment ✅ VERIFIED

Non-outdated thread: bcomnes "Add a comment about where this goes (stripe checkout)" — marked `[x]`.

**Verified:** `billing-field.js:68`: `// Stripe Checkout redirect. User returns to /account/ with billing=success|cancel.` — present. Thread can be closed on GitHub.

---

#### `helmet.js` — dead plugin audit ✅ VERIFIED

Non-outdated thread: bcomnes "Are we using this?" — plan marks `[x]` as "verified, static.js depends on helmet."

**Verified:** `plugins/helmet.js` registers `@fastify/helmet` with full CSP configuration (frame-src, script-src, etc.) and is a named Fastify plugin. Clearly active and in use. Thread can be closed on GitHub.

---

### New threads not previously captured in plan

#### `post-checkout.test.js:113` — URL substring sanitization (GitHub Advanced Security, 2026-02-27) ✅ FIXED

GitHub Advanced Security: `body.url.startsWith('https://checkout.stripe.com')` may match `https://checkout.stripe.com.evil.com`.

**Fix applied:** Changed to `assert.strictEqual(new URL(body.url).hostname, 'checkout.stripe.com', ...)`. Clears the security scan finding.

---

#### `user-row-edit.js:163` — `subLoading` stuck on null ref (Copilot, 2026-03-07) ✅ FIXED

`handleGrantSubscription` set `setSubLoading(true)` before the null check of `subFormRef.current`. If the ref was null, early return left UI stuck in loading/disabled state.

**Fix applied:** Moved null check before `setSubLoading(true)` and `setSubError(null)`.

---

#### `worker/plugins/billing-decorators.d.ts` — move to shared resources (Copilot/bcomnes)

Outdated thread: bcomnes "Maybe move this to a shared plugin in resources."

**Status:** Deferred for post-launch cleanup. Centralizing in `@breadcrum/resources` is a good long-term goal but not blocking production.
