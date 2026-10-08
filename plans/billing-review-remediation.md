# Billing Review Remediation

This plan tracks the correctness and usability findings from a post-rebase review of PR #689.

## Findings and implementation status

- [x] Prevent webhook reconciliation events from being dropped by per-customer throttling by enqueueing each event as its own durable job.
- [x] Serialize Stripe synchronization across webhook, user, and admin entry points with customer and user advisory locks held across the Stripe read and database write.
- [x] Enforce monthly free-tier quota atomically for concurrent bookmark creation requests with a per-user transaction lock.
- [x] Define safe transitions between Stripe subscriptions and administrator-managed custom grants by rejecting active provider conflicts and guarding database upserts against provider replacement.
- [x] Keep existing subscription status, billing portal, and Stripe webhooks available when the billing UI flag is disabled while leaving new checkout gated.
- [x] Map configured Stripe price lookup keys to the supported internal `yearly_paid` plan code and ignore unsupported prices during reconciliation.
- [x] Allow disabled users with existing Stripe customers to access the billing portal for cancellation and payment updates.
- [x] Make admin subscription badges reflect effective entitlement and handle missing plan labels without showing a false free-plan badge.
- [x] Make custom subscription end-date inputs inclusive of the selected UTC calendar day.
- [x] Show checkout activation feedback only after confirming successful synchronization and freshly fetched entitlement.

## Regression coverage

- [x] Added queue and synchronization tests covering durable event enqueueing, lock ordering, and configured price mapping.
- [x] Added a concurrent bookmark creation test proving requests cannot exceed the free-tier quota.
- [x] Added checkout/custom-grant conflict coverage and SQL assertions preventing Stripe/custom provider replacement.
- [x] Updated webhook, billing-status, and portal tests to cover behavior while billing UI is disabled and when an account is disabled.
- [x] Added client tests for admin subscription status, inclusive expiry dates, and checkout activation feedback.
- [x] Added worker activation coverage for Stripe-configured and Stripe-unconfigured roles.

## Validation

- [x] `pnpm run test:tsc` passed.
- [x] `pnpm run test:eslint` passed.
- [x] `pnpm run build` passed, including the Giscus patch verification.
- [x] Focused billing, bookmark, worker, and client test suites passed.
- [x] `pnpm run test:node` passed with the full Node test suite.

The synchronization and user locks hold a database transaction open during Stripe API calls, so monitor database pool pressure and Stripe latency under production traffic.
