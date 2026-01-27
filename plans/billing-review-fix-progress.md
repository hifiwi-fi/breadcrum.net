# Billing Review Fix Progress

Created: 2026-06-02

This file tracks follow-up work from the billing/subscriptions review. No implementation changes have been made yet.

## Goals

- Keep billing disabled-by-default without breaking unrelated app boot, CI, or existing tests.
- Preserve clean billing data when users switch between custom and Stripe providers.
- Fix admin/frontend edge cases that could misrepresent billing state or accidentally change quota policy.
- Remove local-only agent settings from the repository diff.

## Findings To Fix

### 1. Stripe Secret Required At Global Boot

Status: fixed

Problem:
- `packages/web/plugins/billing.js` requires `STRIPE_SECRET_KEY` at boot.
- `packages/worker/plugins/billing.js` requires `STRIPE_SECRET_KEY` at boot.
- Release workflow regenerates `.env` before tests and does not provide Stripe secrets.
- Billing routes are feature-flagged, but the app can fail before routes are reached.

Plan:
- Decide whether Stripe should be optional at boot or whether dev/test generated env files should always include fake Stripe keys.
- If keeping required-at-boot behavior, update web and worker default env generation/test helper paths to provide safe fake test keys.
- If making Stripe optional, update billing plugins and route/worker code to fail clearly only when billing is enabled and Stripe config is missing.
- Add or update a boot test proving a generated dev/test env can start with billing disabled.

Implemented:
- Made web and worker Stripe clients optional at boot.
- Added explicit Stripe configuration guards to billing routes, admin billing sync, webhook verification, admin user deletion, and the worker sync processor.
- Admin user deletion now blocks if a Stripe customer mapping exists but Stripe is not configured, avoiding silent external billing leaks.

Verification:
- Run `npm run test:tsc` in `packages/web` and `packages/worker`.
- Run a representative existing web test that calls `build(t)` without custom Stripe env.
- Run release-style env generation followed by app boot.

### 2. Provider Switch Leaves Stale Subtype Rows

Status: fixed

Problem:
- `syncStripeSubscriptionToDb()` and `createCustomSubscription()` attempt provider switching by deleting the parent `subscriptions` row and upserting it in the same CTE.
- Postgres updates the parent row instead of cascading old subtype deletion, leaving stale subtype rows attached to the same subscription id.

Plan:
- Update the provider switch CTEs to explicitly delete the opposite subtype row before inserting/updating the new subtype.
- For Stripe sync, delete any `custom_subscriptions` row for the user subscription id before upserting `stripe_subscriptions`.
- For custom grants, delete any `stripe_subscriptions` row for the user subscription id before upserting `custom_subscriptions`.
- Add database-backed tests for custom-to-stripe and stripe-to-custom transitions.

Implemented:
- `syncStripeSubscriptionToDb()` explicitly deletes the matching custom subtype row before writing the Stripe subtype.
- `createCustomSubscription()` explicitly deletes the matching Stripe subtype row before writing the custom subtype.
- Billing query tests now assert the generated CTEs include those opposite-subtype deletes.

Verification:
- Run billing query tests.
- Add assertions that only the active provider subtype row remains after provider switches.

### 3. Empty Number Flag Saves As Zero

Status: fixed

Problem:
- Admin flags parse number inputs with `Number(formElement.value)`.
- `Number('')` returns `0`, so clearing `free_bookmarks_per_month` can silently set the quota to zero.

Plan:
- Treat empty numeric input as invalid before parsing.
- Prefer checking `formElement.value.trim() === ''` and `Number.isFinite(Number(value))`.
- Consider using `valueAsNumber` plus input validity if that better matches browser behavior.
- Add focused client-side test coverage if the current test setup supports it.

Implemented:
- Empty numeric flag inputs now throw a user-visible validation error before parsing.
- Non-finite numeric values remain rejected.

Verification:
- Run web type-check.
- Run account/admin client render tests.
- Manually verify empty numeric flag input shows an error and does not submit `0`.

### 4. Trialing Pending Settlement UI

Status: fixed

Problem:
- Backend entitlement blocks unsettled Stripe `trialing` subscriptions.
- Account billing UI only treats unsettled `active` subscriptions as pending settlement.
- Unsettled `trialing` subscriptions can render as `Free` with a `Subscribe` button.

Plan:
- Change pending settlement detection to include `active` and `trialing`.
- Keep the backend settlement-driven entitlement behavior unchanged.
- Add a render-level/client test if practical.

Implemented:
- Account billing pending-settlement detection now includes both `active` and `trialing` Stripe subscriptions.

Verification:
- Run web type-check.
- Verify account billing UI displays `Paid (pending settlement)` and no duplicate subscribe action for unsettled `trialing`.

### 5. Local Claude Settings In Diff

Status: fixed

Problem:
- `.claude/settings.local.json` is included in the diff despite `.gitignore` ignoring it.
- It contains local paths and broad local agent permission settings.

Plan:
- Remove `.claude/settings.local.json` from version control in this branch.
- Keep `.gitignore` entry intact.

Implemented:
- Removed `.claude/settings.local.json` from the branch while leaving the existing `.gitignore` rule in place.

Verification:
- Run `git status --short` and confirm `.claude/settings.local.json` is not tracked in the diff.

## Suggested Order

1. Fix Stripe boot/config behavior first because it can block CI and unrelated tests.
2. Fix provider subtype cleanup because it affects billing data integrity.
3. Fix the number flag parser and trialing pending settlement UI.
4. Remove the local Claude settings file from the tracked diff.
5. Run focused tests first, then broader workspace tests.

## Test Commands

```sh
npm run test:tsc --workspace @breadcrum/resources
npm run test:tsc --workspace @breadcrum/web
npm run test:tsc --workspace @breadcrum/worker
node --test packages/resources/billing/billing-queries.test.js
node --test packages/web/routes/api/billing/*.test.js
node --test packages/web/routes/api/bookmarks/put-bookmarks.test.js
```

Note: adjust commands to this repo's preferred package manager invocation before running.
