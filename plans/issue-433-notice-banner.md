# Plan: Service Notice Banner (Issue 433)

## Goal
Add a site-wide notice banner (similar to the verify-email banner) that can be configured via the admin flags UI without deploys. This should notify active users about service degradations or announcements. Include optional per-banner background colors.

## Relevant Code Paths (current)
- Flags system: `packages/web/plugins/flags/index.js`, `packages/web/plugins/flags/frontend-flags.js`, `packages/web/plugins/flags/backend-flags.js`
- Public flags endpoint: `packages/web/routes/api/flags/get-flags.js`
- Admin flags endpoints: `packages/web/routes/api/admin/flags/get-admin-flags.js`, `packages/web/routes/api/admin/flags/put-admin-flags.js`
- Admin flags UI: `packages/web/client/admin/flags/client.js`
- Global header + existing email/disabled banners: `packages/web/client/components/header/index.js`, `packages/web/client/components/header/index.css`
- Frontend state/flags: `packages/web/client/hooks/state.js`, `packages/web/client/hooks/useFlags.js`
- Global client bootstrap (mounts Header): `packages/web/client/globals/global.client.js`

## Proposed Approach
Use the existing feature flag system to store two frontend flags for messages and two optional color flags. Fetch flags on all pages via the existing `useFlags` hook, then render banners in the header when messages are non-empty. For the dismissible message, persist dismissal on the user record so it follows them between devices and reappears when the message changes. This keeps updates live via admin flags without deploys.

## Administrative UX (set/clear)
- Entry point: existing Admin → Flags page (`/admin/flags/`) where flags are editable.
- Set: admin enters text into two fields:
  - `service_notice_message` (non-dismissible)
  - `service_notice_dismissible_message` (dismissible)
- Optional colors:
  - `service_notice_message_color`
  - `service_notice_dismissible_message_color`
- Save: existing Save button persists the flag values to `feature_flags`; users see it once flags are refreshed.
- Clear: admin clears either field (empty string) and saves; the corresponding banner disappears.
- Plain text only: messages are treated as text in the banner (no HTML rendering).

## End-User UX (dismissible vs non-dismissible)
- Non-dismissible message:
  - If `service_notice_message` is empty: no banner rendered.
  - If set: banner displays without a dismiss control and persists until admin clears/changes it.
- Dismissible message:
  - If `service_notice_dismissible_message` is empty: no banner rendered.
  - If set: banner displays with a dismiss button (e.g., “Dismiss” or “×”).
  - Dismiss hides the dismissible banner for that user across devices.
  - If the admin updates the dismissible message text, the banner should show again.
- If both messages are set: render both banners in a consistent order (e.g., non-dismissible first, then dismissible).

## Dismissible State Storage (server-side)
- Store dismissal state on the user (lightweight field) so it follows them between devices.
- Key dismissal by a hash of the dismissible message (or a message id if we add one later).
- Behavior:
  - On render: if dismissible and user’s dismissed hash matches the current dismissible message hash, do not render the dismissible banner.
  - On dismiss: update the user record with the current dismissible message hash.
  - On message change: stored value won’t match, so the dismissible banner reappears.
  - Color changes do not affect dismissal visibility (hash is message-only).
  - Non-authenticated users: always see the dismissible banner.

## Implementation Steps
1. Add new frontend flag definitions in `packages/web/plugins/flags/frontend-flags.js`:
   - `service_notice_message` (type: string, default: empty string, description: "Service notice banner message (non-dismissible)").
   - `service_notice_dismissible_message` (type: string, default: empty string, description: "Service notice banner message (dismissible)").
   - `service_notice_message_color` (type: string, default: empty string, description: "Background color for the service notice banner (non-dismissible). Leave empty for default.").
   - `service_notice_dismissible_message_color` (type: string, default: empty string, description: "Background color for the service notice banner (dismissible). Leave empty for default.").
   - This automatically updates admin flag schemas/endpoints and the admin UI.

2. Add a lightweight user field + migration:
   - Add a nullable field like `service_notice_dismissed_hash` (text) on `users`.
   - Include the field in user schemas/queries so it’s available to the client.

3. Ensure flags are fetched globally so the banner reflects updates:
   - Use `useFlags()` in `packages/web/client/components/header/index.js` (or in `packages/web/client/globals/global.client.js`) so the hook runs on every page.
   - Keep the state update behavior from `useFlags` (it already writes to `state.flags`).

4. Render the notice banners in `packages/web/client/components/header/index.js`:
   - Non-dismissible: if `state.flags.service_notice_message` is non-empty, render a banner without a dismiss control.
   - Dismissible: if `state.flags.service_notice_dismissible_message` is non-empty, render a banner with a dismiss control unless the user has already dismissed the current message hash.
   - Keep semantics similar to the email confirmation banner for consistency.
   - Render message as plain text to avoid injection risk.

5. Add an API update path for dismissal:
   - Option A: extend `PUT /api/user` to accept `service_notice_dismissed_hash`.
   - Option B: add a dedicated endpoint (e.g., `POST /api/user/notice:dismiss`) to update the field.
   - Ensure authenticated-only and user-scoped updates.

6. Style the banner in `packages/web/client/components/header/index.css`:
   - Add a new class (e.g., `.bc-header-service-notice`) with distinct background and text colors.
   - Reuse layout/spacing patterns from `.bc-header-email-warning` to keep alignment consistent.
   - Support optional per-banner background color overrides via inline style.

7. Update any types or docs if needed:
   - `StateType` is derived from `defaultFrontendFlags`, so adding the flag should flow automatically.
   - If any docs list flags, update them (check `packages/web/client/admin/README.md` if needed).

8. Tests / verification:
   - If there are no existing component tests for Header, do a manual check in dev mode:
     - Set both message fields in admin flags UI.
     - Confirm the banner appears/updates without deploy.
     - Dismissible variant: dismiss hides and persists across devices; new message shows again.
     - Non-dismissible variant: dismiss control not present.
   - Optional: add a small unit test for `useFlags` behavior if the repo has patterns for client hook tests.

## Current Implementation (as of 2026-02-04)
- Flags:
  - `service_notice_message`, `service_notice_dismissible_message`
  - `service_notice_message_color`, `service_notice_dismissible_message_color`
- Admin flags UI:
  - Flags page uses a DL layout similar to Account.
  - Message flags include a color input, a color picker, and preset swatches (including existing banner colors and admin badge colors).
  - Color values are saved as strings; blank means default banner color.
- Banner rendering:
  - Header renders non-dismissible and dismissible banners when messages are present.
  - Optional background color overrides are applied inline from the color flags.
  - Dismissible hash is based on message text only (color changes do not reset dismissal).
- Dismissal persistence:
  - `users.service_notice_dismissed_hash` column added with migration `026.*`.
  - Update path in `PUT /api/user`.
  - User query includes `service_notice_dismissed_hash`.
- Types:
  - Frontend state derives new flags from `defaultFrontendFlags` and `useFlags`.
  - TSC checks passed for `packages/web`.

## Remaining Work
- Manual QA:
  - Verify both banners render with and without custom colors.
  - Confirm dismissible banner hides per-user and reappears when message text changes (color-only changes should not re-show).
  - Confirm admin presets and picker behave as expected in light/dark themes.

## Notes / Open Decisions
- Whether to allow HTML in the message. Recommend treating it as plain text to avoid injection risk (render as text only).
