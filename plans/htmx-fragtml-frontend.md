# Plan: Full Fastify + fragtml + htmx Frontend Replacement

## Goal
Replace the domstack/Preact frontend with request-time Fastify routes rendered through `fastify-fragtml`, `fragtml` templates, and `htmx.org@4.0.0-beta4` from npm.

The end state:
- Fastify owns all HTML, XML, JSON-feed, manifest, and generated text responses.
- `fastify-fragtml` owns full-page and fragment rendering.
- htmx owns browser-side navigation and partial updates.
- Minimal first-party JavaScript remains only where browser APIs require it, such as passkeys.
- `@domstack/static`, Preact page bundles, Preact hooks, domstack page/layout vars, and domstack templates are removed.
- Full type checking is maintained throughout the migration.

## Current State
Completed:
- Added `fastify-fragtml`, `fragtml`, and `htmx.org@4.0.0-beta4`.
- Added `packages/web/plugins/fragtml.js`.
- Added typed view context and root layout under `packages/web/views/**`.
- Added Fastify-rendered HTML routes with htmx `main` fragment support.
- Added `packages/web/scripts/build-assets.js`, which writes htmx, app JS/CSS, giscus, passkey scripts, content media, and static assets into `packages/web/public`.
- Replaced domstack-generated markdown/content pages and generated text/XML/feed files with Fastify routes.
- Removed `packages/web/client/**`.
- Removed domstack and Preact build/watch scripts and package dependencies.

Not completed:
- Phase 10 final hardening still needs the remaining manual browser smoke checks.

## Progress Tracking
- [x] Initial foundation slice: dependencies, `fastify-fragtml` plugin, typed root layout/context, exact `/` route, htmx runtime assets.
- [x] Phase 0: Stabilize the new foundation.
- [x] Phase 1: Layout, header, footer, notices, auth context.
- [x] Phase 2: Public auth and account entry flows.
- [x] Phase 3: Bookmarks.
- [x] Phase 4: Search, tags, feeds.
- [x] Phase 5: Episodes and archives.
- [x] Phase 6: Account and admin.
- [x] Phase 7: Docs, legal, blog, static markdown.
- [x] Phase 8: Generated files and feeds.
- [x] Phase 9: Remove domstack and Preact.
- [ ] Phase 10: Final hardening.

### Active Phase
Phase 10 is in progress.

### Phase 10 Progress
- [x] Run dependency audit after the cutover.
- [x] Run full web node test suite after the cutover.
- [x] Add browser/manual QA checklist for htmx navigation and history.
- [x] Check accessibility of forms/buttons/fragment swaps.
- [x] Verify CSP still permits required scripts and blocks inline script.
- [x] Verify caching headers for static assets.
- [x] Verify `HX-Redirect` and normal redirects behave correctly.
- [x] Verify no route accidentally returns JSON to browser HTML flows.
- [x] Run production simulation with `npm run prod-sim`.

Phase 10 automated verification passed so far:
- `pnpm run knip`
- `npm run test:node` (396 tests passed after accessibility hardening)
- `npm run prod-sim`, then `curl -i http://127.0.0.1:3000/health` and `curl -I http://127.0.0.1:3000/`
- `curl -I http://127.0.0.1:3000/assets/htmx.min.js` in prod-sim development mode returned `cache-control: public, max-age=0`
- Production-env injection for `/assets/htmx.min.js` returned `cache-control: public, max-age=600`
- Accessibility hardening added:
  - programmatic focus restoration after htmx swaps
  - `tabindex="-1"` on the htmx-swapped `<main>`
  - accessible names for search, feed URL, and bookmarklet copy controls
  - `role="alert"` / `role="status"` for swappable error and status regions
  - row-specific labels and pressed state for repeated bookmark actions
- Accessibility hardening verification:
  - `npm run test:tsc`
  - `npm run test:eslint -- --fix-dry-run`
  - `node --test routes/root.test.js routes/bookmarks.test.js routes/search.test.js routes/feeds.test.js routes/archives.test.js routes/episodes.test.js routes/account.test.js routes/admin.test.js routes/content.test.js` (91 tests passed)
  - `npm run build`
  - Static grep checks found no `type="search" name="query"` controls without `aria-label`, no `bc-form-errors` blocks without `role="alert"`, and no `bc-info-message` blocks without `role="status"`.

Note: `npm run test:node` emitted `MaxListenersExceededWarning` messages from repeated `StatWatcher` listeners during multi-file startup, but all tests passed.

Manual browser QA checklist:
- Anonymous: open `/`, `/docs/`, `/blog/`, `/login/`, and `/register/`; verify htmx-boosted navigation updates `<main>` while history/back/forward work.
- Anonymous auth flow: submit invalid login, register, password reset, email confirmation, and unsubscribe forms; verify validation errors remain HTML and do not replace the whole shell unexpectedly.
- Authenticated user: log in with cookie session, visit `/bookmarks/`, `/bookmarks/add/`, `/search/bookmarks/`, `/tags/`, `/feeds/`, `/episodes/`, `/archives/`, and `/account/`; verify filters, pagination, edit forms, delete/toggle actions, and htmx redirects.
- Admin: visit `/admin/`, `/admin/flags/`, `/admin/users/`, `/admin/stats/`, `/admin/deps/`, `/admin/redis-cache/`, and `/admin/pgboss/`; verify non-admin users are rejected and admin forms return HTML.
- Browser APIs: verify passkey login/registration assets load and WebAuthn paths still work; verify bookmarklet copy behavior on `/docs/bookmarks/bookmarklets/`.
- Content/media: verify blog comments hydrate through `/assets/giscus.mjs`, social embeds load lazily, images under `/static/**` and `/content/**` render, and generated `/feed.json`, `/feed.xml`, `/sitemap.xml`, `/manifest.webmanifest`, `/robots.txt`, `/opensearch.xml`, and `/service-worker.js` return the expected content types.
- Accessibility pass: keyboard through header, forms, modal-like delete confirmations, pagination, and htmx-updated fragments; verify focus remains usable after swaps and button/link labels are understandable.

### Phase 9 Progress
- [x] Inventory remaining `client/**`, domstack, and Preact-only dependencies.
- [x] Move remaining static source assets from `client/static` and `client/favicon.ico` into `assets/static` / `assets/favicon.ico`.
- [x] Update `build:assets`, `watch:assets`, `build`, and `watch` to stop invoking domstack.
- [x] Remove old `client/**` source and domstack templates.
- [x] Remove `@domstack/static`, Preact-only dependencies, and obsolete client-only helpers from `package.json` / lockfile.
- [x] Re-run type checking, linting, focused route tests, build, and relevant broad HTML tests.

Phase 9 verification passed:
- `npm run test:tsc`
- `npm run test:eslint -- --fix-dry-run`
- `npm run build`
- `node --test routes/root.test.js routes/content.test.js routes/generated.test.js`
- `node --test routes/auth.test.js routes/bookmarks.test.js routes/feeds.test.js routes/tags.test.js routes/search.test.js routes/episodes.test.js routes/archives.test.js routes/account.test.js routes/admin.test.js routes/root.test.js routes/content.test.js routes/generated.test.js`
- `pnpm run knip`

Note: the broad route test command emitted `MaxListenersExceededWarning` messages from repeated `StatWatcher` listeners during multi-file startup, but all 123 tests passed.

### Phase 8 Progress
- [x] Inventory domstack-generated template outputs.
- [x] Add Fastify routes for `/robots.txt`, `/opensearch.xml`, `/giscus.json`, `/manifest.webmanifest`, and `/service-worker.js`.
- [x] Add Fastify routes for public blog feeds `/feed.json` and `/feed.xml` using the new `packages/web/content/blog` source.
- [x] Add Fastify route for `/sitemap.xml` from the Fastify-rendered URL inventory.
- [x] Add route tests for generated text/XML/JSON responses.
- [x] Re-run type checking, linting, focused generated route tests, and build compatibility.

Phase 8 verification passed:
- `npm run test:tsc`
- `npm run test:eslint -- --fix-dry-run`
- `node --test routes/content.test.js routes/generated.test.js`
- `npm run build`

### Phase 7 Progress
- [x] Inventory markdown/static content under `packages/web/client/about`, `client/docs`, `client/legal`, and `client/blog`.
- [x] Choose markdown renderer/frontmatter convention: declare `markdown-it@14.1.1` and parse simple YAML-like frontmatter in the Fastify content route code.
- [x] Move markdown source out of `client/**`.
- [x] Add Fastify routes for `/about/`, `/docs/**`, `/legal/**`, `/blog/`, year indexes, and blog posts.
- [x] Preserve content images through the `public` asset build path.
- [x] Port docs/blog wrappers: breadcrumbs, article metadata, edit links, blog archive indexes, and comments.
- [x] Add route tests for public content pages and htmx main fragments.
- [x] Re-run type checking, linting, asset build, and focused content route tests.

Phase 7 verification passed:
- `npm run test:tsc`
- `npm run test:eslint -- --fix-dry-run`
- `npm run build:assets`
- `node --test routes/content.test.js`
- `npm run build`

### Phase 0 Checklist
- [x] Keep the current `/` Fastify route and tests.
- [x] Add typed htmx request/response helpers.
- [x] Add typed fragment-selection helpers.
- [x] Add typed form validation error helpers.
- [x] Add static asset route tests for `/assets/htmx.min.js` and `/assets/app.css`.
- [x] Make `build:assets` idempotent and watch-friendly.
- [x] Re-run Phase 0 verification.

Phase 0 verification passed:
- `npm run build:assets`
- `npm run test:tsc`
- `npm run test:eslint -- --fix-dry-run`
- `node --test lib/htmx.test.js routes/root.test.js`
- `npm run build`
- `node scripts/build-assets.js --watch` starts and shuts down cleanly.

### Phase 1 Checklist
- [x] Port header/footer markup from old components to `views/components`.
- [x] Add optional authenticated user to `ViewContext`.
- [x] Add frontend flags/service notices to `ViewContext`.
- [x] Recreate email confirmation and disabled account banners.
- [x] Recreate authenticated nav.
- [x] Replace local-storage-only header filters with URL params or form controls.
- [x] Add route tests for anonymous and authenticated shell rendering.

Phase 1 progress:
- Header/footer are now typed `views/components` functions used by the root layout.
- `ViewContext` now has a typed optional `ViewUser` derived from the signed JWT session cookie.
- `createRouteViewContext()` resolves frontend flags, htmx request state, and optional cookie-authenticated user state over the wire.
- Header renders anonymous login/register links or authenticated app navigation from `context.user`.
- Service notices, dismissible-notice hiding, email confirmation warning, and disabled-account warning are rendered server-side.
- Header filter controls now use `toread=true`, `starred=true`, and `sensitive=true` URL query params instead of local storage.
- Route tests cover anonymous and cookie-authenticated shell rendering.
- Verification passed for this phase:
  - `npm run build:assets`
  - `npm run test:tsc`
  - `npm run test:eslint -- --fix-dry-run`
  - `node --test lib/htmx.test.js views/components/header.test.js routes/root.test.js`

## References
- `fragtml`: https://github.com/bcomnes/fragtml
- `fastify-fragtml`: https://github.com/bcomnes/fastify-fragtml
- htmx 4 docs: https://four.htmx.org/docs/
- htmx npm package/version: `htmx.org@4.0.0-beta4`

## Definition Of Done
- Every current public URL has a Fastify route or intentional redirect.
- No route depends on `packages/web/public/**/index.html` generated by domstack.
- `npm run build` no longer invokes domstack.
- `npm run watch` no longer invokes domstack.
- `packages/web/client/**` is either removed or reduced to static source assets that have been moved into the new structure.
- `@domstack/static`, Preact-only frontend dependencies, and unused client hooks/components are removed.
- `npm run test:tsc`, `npm run test:eslint`, `npm run test:node`, `npm run build`, and `pnpm run knip` pass.

## Type-Checking Requirements
- Keep JS with JSDoc type checking; do not introduce untyped `any` boundaries for route/view data.
- Every template gets an explicit `FragtmlTemplate<Context, LayoutName, FragmentId>` or narrower typed wrapper.
- Every layout is typed with `FragtmlLayoutMap<ViewContext, LayoutName, FragmentId>`.
- All route handlers pass complete typed view contexts through a helper such as `createViewContext()`.
- Fragment IDs are string unions, not free-form strings.
- Shared query/mutation helpers continue to expose typed inputs and outputs.
- Form body parsing is validated with JSON schema or typed normalization before use.

## Target Structure
Proposed final structure:

```text
packages/web/
  assets/
    app.js
    app.css
    htmx-hooks.js
    static/
  plugins/
    fragtml.js
  routes/
    routes.js
    home.view.js
    auth/
    bookmarks/
      routes.js
      view.js
      fragments/
      actions.js
    search/
    tags/
    feeds/
    episodes/
    archives/
    account/
    admin/
    docs/
    blog/
    legal/
    generated/
  views/
    context.js
    layouts.js
    components/
  scripts/
    build-assets.js
```

Colocation rule:
- Put route-specific templates and fragments next to the route family they affect, such as `routes/login/view.js` or `routes/password_reset/view.js`.
- Keep reusable data/session mutation handlers close to the API route family that owns the mutation, such as `routes/api/user/password/password-reset-actions.js` or `routes/api/user/email/verify-email-action.js`; HTML routes should import those API-owned helpers instead of owning duplicate mutation code.
- Keep only true shared shell/common modules hoisted, currently `views/context.js`, `views/layouts.js`, `views/components/**`, and generic helpers under `lib/**`.
- Use package-level import aliases for those common folders:
  - `#views/*` -> `./views/*`
  - `#lib/*` -> `./lib/*`
- Use relative imports inside a route family for colocated views/fragments.

Keep `packages/web/routes/api/**` for JSON API consumers. Browser HTML routes should reuse the same query/mutation helpers where practical, but should return HTML or htmx response headers.

## Rendering Architecture
- Register `fastify-fragtml` globally with named layouts.
- Use a root layout with stable fragment boundaries:
  - `main`
  - later: `header`, `notice`, and other shared swap targets if needed.
- Use `reply.render(template, context)` for full-page responses.
- Use `reply.render(template, context, { fragmentId })` for htmx partial responses.
- Use `HX-Redirect`, `HX-Location`, `HX-Push-Url`, and `HX-Replace-Url` for browser navigation semantics.
- Use `204 No Content` for successful actions that do not need a swap.
- Use `hx-swap-oob` or htmx 4 partials only when one action must update multiple regions.

## Asset Pipeline
Build into `packages/web/public`, which is already served by `packages/web/plugins/static.js`.

Current pipeline:
- `packages/web/assets/app.js` -> `packages/web/public/assets/app.js`
- `packages/web/assets/app.css` -> `packages/web/public/assets/app.css`
- `packages/web/assets/register.js` -> `packages/web/public/assets/register.js`
- `packages/web/assets/passkey-login.js` -> `packages/web/public/assets/passkey-login.js`
- `packages/web/assets/passkey-register.js` -> `packages/web/public/assets/passkey-register.js`
- `htmx.org/dist/htmx.min.js` -> `packages/web/public/assets/htmx.min.js`
- `giscus` npm module -> `packages/web/public/assets/giscus.mjs`
- `@passwordless-id/webauthn` browser module -> `packages/web/public/assets/webauthn.min.js`
- `packages/web/assets/static/**` -> `packages/web/public/static/**`
- `packages/web/content/**` media files -> `packages/web/public/content/**`
- `packages/web/assets/favicon.ico` -> `packages/web/public/favicon.ico`

Required follow-up:
- Add cache-busting or hashed asset names as post-cutover hardening.
- Confirm no missing static/media references after the final full-route pass.

## Complete Migration Inventory
Fastify-rendered already:
- `/`
- `/about/`
- `/feed.json`
- `/feed.xml`
- `/giscus.json`
- `/login/`
- `/logout/`
- `/password_reset/`
- `/password_reset/confirm/`
- `/register/`
- `/email_confirm/`
- `/unsubscribe/`
- `/bookmarks/`
- `/bookmarks/submit/`
- `/bookmarks/add/`
- `/bookmarks/view/`
- `/account/`
- `/admin/deps/`
- `/admin/flags/`
- `/admin/pgboss/`
- `/admin/redis-cache/`
- `/admin/stats/`
- `/admin/users/`
- `/admin/users/view/`
- `/archives/`
- `/archives/view/`
- `/blog/`
- `/blog/:year/`
- `/blog/:year/:slug/`
- `/docs/`
- `/docs/**`
- `/episodes/`
- `/episodes/view/`
- `/feeds/`
- `/manifest.webmanifest`
- `/opensearch.xml`
- `/robots.txt`
- `/legal/`
- `/legal/**`
- `/search/`
- `/search/archives/`
- `/search/bookmarks/`
- `/search/episodes/`
- `/service-worker.js`
- `/sitemap.xml`
- `/tags/`

Interactive Preact pages still to replace:
- None in the account, admin, bookmark, search, tags, feeds, episodes, or archives app surfaces.

Markdown/static content replaced:
- `/about/`
- `/docs/bookmarks/bookmarklets/`
- `/docs/tutorial/`
- `/docs/` and all docs subpages
- `/legal/` and all legal subpages
- `/blog/` indexes and post pages

Domstack templates replaced:
- `feeds.template.js`
- `giscus.json.template.js`
- `opensearch.xml.template.js`
- `robots.txt.template.js`
- `service-worker.template.js`
- `sitemap.xml.template.js`

## Migration Phases

### Phase 0: Stabilize The New Foundation
Goal: make the new Fastify/fragtml/htmx foundation production-safe while domstack still exists.

Tasks:
- Keep the current `/` Fastify route and tests.
- Add typed helpers for:
  - htmx request detection
  - htmx redirects/locations
  - fragment selection
  - form validation errors
  - common page response metadata
- Add route tests for:
  - full document response
  - htmx fragment response
  - static `/assets/htmx.min.js`
  - static `/assets/app.css`
- Make `build:assets` idempotent and watch-friendly.
- Document the temporary state: domstack still builds old routes.

Exit criteria:
- `npm run build`, `npm run test:tsc`, `npm run test:eslint`, and root route tests pass.

### Phase 1: Layout, Header, Footer, Notices, Auth Context
Goal: make the Fastify shell match the old global app chrome.

Tasks:
- Port header/footer markup from old components to `views/components`.
- Add optional authenticated user to `ViewContext`.
- Add frontend flags/service notices to `ViewContext`.
- Recreate email confirmation and disabled account banners.
- Recreate authenticated nav:
  - bookmarks
  - tags
  - feeds
  - account/user link
  - logout
- Replace local-storage-only header filters with URL params or form controls:
  - toread
  - starred
  - sensitive
- Add route tests for anonymous and authenticated shell rendering.

Exit criteria:
- New Fastify shell supports anonymous and authenticated users.
- Existing `/` still works.

### Phase 2: Public Auth And Account Entry Flows
Goal: remove Preact from login/register/logout/password-reset/email/unsubscribe flows.

Routes:
- `/login/`
- `/register/`
- `/logout/`
- `/password_reset/`
- `/password_reset/confirm/`
- `/email_confirm/`
- `/unsubscribe/`

Tasks:
- [x] Add Fastify HTML GET route for `/login/`.
- [x] Add Fastify HTML GET routes for remaining pages.
- [x] Add form POST route for `/login/`.
- [x] Add form POST route for `/logout/`.
- [x] Add form POST routes or htmx adapters around existing API handlers for remaining auth pages.
- [x] Preserve redirect query behavior for login.
- [x] Preserve cookie behavior for login/logout.
- [x] Preserve passkey login where browser WebAuthn APIs require targeted JS.
- [x] Return inline validation fragments for login submissions.
- [x] Keep no-JS fallback for username/password login form.
- [x] Port `/register/`.
- [x] Port `/password_reset/`.
- [x] Port `/password_reset/confirm/`.
- [x] Port `/email_confirm/`.
- [x] Port `/unsubscribe/`.

Phase 2 progress:
- Added API-owned `routes/api/auth/session.js` helpers for password login and logout cookie/auth-token cleanup.
- API `/api/login` and `/api/logout` now reuse the same session helpers as HTML routes.
- Added Fastify `/login/` GET and POST routes with typed form normalization, inline validation errors, redirect sanitization, signed-cookie login, and htmx-aware redirects.
- Added Fastify `/logout/` GET and POST routes; authenticated header logout now uses a POST form instead of a GET link.
- Added API-owned `routes/api/user/password/password-reset-actions.js` helpers for reset-token creation, password update, and reset emails.
- API password reset request/confirm routes now reuse the same password reset helpers as HTML routes.
- Added Fastify `/password_reset/` and `/password_reset/confirm/` GET and POST routes with typed form normalization and inline validation.
- Added API-colocated `routes/api/register/registration-action.js` helper for registration flags, Turnstile validation, email uniqueness checks, email validation, user creation, signed session cookie creation, and verification email sending.
- API `/api/register` now reuses the same registration helper as the HTML route.
- Added Fastify `/register/` GET and POST routes with typed form normalization, inline validation, closed-registration handling, signed-cookie registration, and redirect to `/docs/tutorial/`.
- Added targeted `/assets/register.js` Turnstile rendering code used only by the register page when Turnstile validation is enabled.
- Added Fastify `/email_confirm/` GET and POST routes with cookie-auth login redirects, typed token/update normalization, no-JS form confirmation, and htmx fragment rendering.
- Added API-owned `routes/api/user/email/verify-email-action.js`, backed by the original `verify-email-confirm-handler.js` and `verify-email-update-handler.js` files, so `/email_confirm/` and `/api/user/email:verify` reuse the same mutation path.
- Added Fastify `/unsubscribe/` GET and POST routes with typed email normalization, public email-link unsubscribe behavior, no-JS form fallback, and htmx fragment rendering.
- Added API-owned `routes/api/user/email/unsubscribe/unsubscribe-action.js` and updated `/unsubscribe/` plus `/api/user/email/unsubscribe` to reuse the same mutation path.
- Corrected helper ownership so session, password reset, email confirmation, and unsubscribe mutations now live under `routes/api/**`; the HTML routes call into those API-owned helpers and keep only page views/form normalization colocated with pages.
- Added targeted `/assets/passkey-login.js` for login-page WebAuthn conditional mediation and copied the npm WebAuthn browser module to `/assets/webauthn.min.js`.
- Passkey registration remains in Phase 6 with the account settings/passkey management UI.
- Added route tests for login rendering, validation errors, form login cookie creation, authenticated login redirect, and logout invalidation.
- Added route tests for reset request rendering, reset validation, reset-token confirmation, and login with the new password.
- Added route tests for register rendering, register validation, form registration cookie creation, and closed-registration flags.
- Added route tests for authenticated email confirmation rendering, anonymous login redirects, and form-based account email confirmation.
- Added route tests for unsubscribe rendering, validation errors, and public email-link unsubscribe behavior.
- Added route/static tests for passkey login asset wiring and WebAuthn browser module serving.
- Verification passed for this slice:
  - `npm run test:tsc`
  - `npm run test:eslint -- --fix-dry-run`
  - `npm run build:assets`
  - `node --test lib/htmx.test.js views/components/header.test.js routes/root.test.js routes/auth.test.js`

Phase 2 is complete for public auth and account entry flows. Passkey registration remains in Phase 6 because it belongs to account settings/passkey management.

Exit criteria:
- Auth flows work with normal form navigation.
- htmx submissions return fragments or redirects correctly.
- Old auth Preact bundles no longer referenced by these routes.

### Phase 3: Bookmarks
Goal: port the core app workflow first.

Routes:
- `/bookmarks/`
- `/bookmarks/add/`
- `/bookmarks/submit/`
- `/bookmarks/view/`

Fragments:
- `bookmark-list`
- `bookmark-row`
- `bookmark-view`
- `bookmark-edit`
- `bookmark-actions`
- `pagination`
- `quick-add`
- `notice`

Tasks:
- Render list from existing bookmark query helpers.
- Preserve filters and pagination:
  - `before`
  - `after`
  - `tag`
  - `sensitive`
  - `starred`
  - `toread`
  - `per_page`
- Replace client state hooks with URL params, hidden inputs, or server state.
- Convert actions to htmx forms/buttons:
  - quick add
  - edit
  - save
  - delete
  - star toggle
  - toread toggle
  - sensitive toggle
  - archive URL updates
  - tags updates
- Preserve resolving/pending behavior with htmx polling.
- Preserve search entry into `/search/bookmarks/`.
- Add route and mutation tests.

Phase 3 progress:
- Added Fastify `/bookmarks/` GET route with cookie-auth login redirect, htmx `main` fragment rendering, URL-backed filters, quick-add handoff to `/bookmarks/add/`, and pagination.
- Added Fastify `/bookmarks/submit/` GET route with cookie-auth login redirect, htmx `main` fragment rendering, and quick-add handoff to `/bookmarks/add/`.
- Added Fastify `/bookmarks/add/` GET and POST routes with cookie-auth login redirect, query-prefilled no-JS form rendering, htmx fragment rendering, and form create redirect to `/bookmarks/view/`.
- Added Fastify `/bookmarks/view/` GET route with cookie-auth login redirect, missing-id redirect, single bookmark rendering, not-found state, search handoff, and htmx fragment rendering.
- Added Fastify `/bookmarks/view/` edit mode and POST save handling with cookie-auth login redirect, no-JS form fallback, htmx bookmark-fragment save responses, tag updates, archive URL updates, and API-owned update mutation reuse.
- Added Fastify `/bookmarks/toggle/` POST action route for `toread`, `starred`, and `sensitive` toggles with cookie-auth login redirect and normal/htmx redirects.
- Added Fastify `/bookmarks/delete/` POST action route with cookie-auth login redirect, disclosure-gated row forms, and normal/htmx redirects.
- Added colocated `routes/bookmarks/bookmarks-page-data.js` to reuse the existing bookmark API query helper and pagination logic.
- Added API-owned `routes/api/bookmarks/bookmark-create-action.js` so `/api/bookmarks` and `/bookmarks/add/` share create/de-dupe/background-resolve behavior.
- Added API-owned `routes/api/bookmarks/bookmark-update-action.js` and updated `/api/bookmarks/:id` PUT plus `/bookmarks/view/` POST to reuse one update path.
- Added API-owned `routes/api/bookmarks/bookmark-toggle-action.js` so server-rendered bookmark rows use a shared mutation helper for simple boolean toggles.
- Added API-owned `routes/api/bookmarks/bookmark-delete-action.js` and updated `/api/bookmarks/:id` delete to reuse it.
- Added colocated `routes/bookmarks/list.view.js` for read-oriented bookmark rows, tag links, archive/episode links, date separators, and empty state.
- Added bookmark-local `routes/bookmarks/form-fields.js` helpers for shared form string, checkbox, tag, and archive URL parsing.
- Added resolving bookmark polling with `hx-trigger="every 5s"` and single-bookmark fragment responses from `/bookmarks/view/?fragment=bookmark`.
- Added mutation-specific htmx fragments for edit saves, toggle actions, and delete actions.
- Added route tests for anonymous redirect, authenticated empty state, rendered bookmark rows, htmx fragment responses, pagination links, submit page rendering, add page rendering, add-form creation, detail rendering, edit rendering, edit saves, resolving polling fragments, htmx save/toggle/delete fragments, missing-id redirect, HTML toggle actions, and HTML delete actions.
- Phase 3 is complete for the listed bookmark routes.
- Verification passed for this slice:
  - `npm run test:tsc`
  - `npm run test:eslint -- --fix-dry-run`
  - `npm run build:assets`
  - `node --test routes/bookmarks.test.js`
  - `node --test lib/htmx.test.js views/components/header.test.js routes/root.test.js routes/auth.test.js routes/bookmarks.test.js`

Exit criteria:
- Bookmark list/add/edit/delete/toggle flows work without Preact.
- Existing JSON API behavior remains unchanged.

### Phase 4: Search, Tags, Feeds
Goal: port related list/detail workflows after bookmarks.

Routes:
- `/search/`
- `/search/bookmarks/`
- `/search/archives/`
- `/search/episodes/`
- `/tags/`
- `/feeds/`

Tasks:
- Port search forms and result lists.
- Port tag rename/merge/delete flows using htmx forms.
- Port feed list/edit/default-feed/details UI.
- Preserve podcast feed subscription URLs and copyable values.
- Reuse bookmark row/card fragments where result rows overlap.

Exit criteria:
- Search/tag/feed pages no longer need Preact bundles.

Phase 4 progress:
- Added Fastify `/search/` GET route with cookie-auth login redirect, htmx `main` fragment rendering, query-preserving links to bookmark/archive/episode search, and no Preact bundle reference.
- Added Fastify `/search/bookmarks/` GET route with URL-backed query/filter/pagination params, htmx `main` fragment rendering, empty state, search category navigation, and bookmark result rows that reuse the server-rendered bookmark view fragment.
- Added Fastify `/search/archives/` and `/search/episodes/` GET routes with cookie-auth login redirects, htmx `main` fragment rendering, empty states, category navigation, and compact server-rendered result rows.
- Added API-owned search helpers for bookmarks, archives, and episodes so HTML search pages and JSON API routes share pagination and query behavior:
  - `routes/api/search/bookmarks/search-bookmarks-action.js`
  - `routes/api/search/archives/search-archives-action.js`
  - `routes/api/search/episodes/search-episodes-action.js`
- Added `routes/search/search-route-utils.js` for search-route query param normalization.
- Added `routes/search.test.js` coverage for anonymous redirects, search index rendering, bookmark search empty/results states, and htmx fragments for bookmark/archive/episode search pages.
- Added API-owned tag helpers in `routes/api/tags/tag-actions.js` and implemented JSON API rename/merge routes that were previously `notImplemented()`.
- Added Fastify `/tags/` GET route with cookie-auth login redirect, htmx `main` fragment rendering, scaled tag links, and no Preact bundle reference.
- Added Fastify `/tags/delete/`, `/tags/rename/`, and `/tags/merge/` POST action routes that reuse API-owned tag mutation helpers.
- Added `routes/tags.test.js` coverage for anonymous redirects, empty state, tag list/action forms, rename, merge, delete, and htmx fragment rendering.
- Added API-owned feed helpers in `routes/api/feeds/feed-actions.js` for feed list, default feed details, selected feed details, and feed metadata updates.
- Refactored JSON feed details/update routes to reuse the API-owned feed helpers, and fixed feed list query behavior so feeds with zero episodes are returned and non-default feeds get an explicit `default_feed=false`.
- Added Fastify `/feeds/` GET route with cookie-auth login redirect, htmx `main` fragment rendering, default/selected feed details, feed list navigation, preserved JSON/RSS/subscription URLs, and no Preact bundle reference.
- Added Fastify `/feeds/update/` POST action route for no-JS feed metadata edits.
- Added `routes/feeds.test.js` coverage for anonymous redirects, default feed display, edit form rendering, metadata update, and htmx fragment rendering.
- Phase 4 is complete for the listed search, tag, and feed routes.
- Verification passed for this slice:
  - `npm run test:tsc`
  - `npm run test:eslint -- --fix-dry-run`
  - `npm run build:assets`
  - `node --test routes/search.test.js`
  - `node --test routes/tags.test.js`
  - `node --test routes/feeds.test.js`
  - `node --test lib/htmx.test.js views/components/header.test.js routes/root.test.js routes/auth.test.js routes/bookmarks.test.js routes/search.test.js routes/tags.test.js routes/feeds.test.js`

### Phase 5: Episodes And Archives
Goal: port media/article result pages and detail views.

Routes:
- `/episodes/`
- `/episodes/view/`
- `/archives/`
- `/archives/view/`

Tasks:
- Port list pagination and filters.
- Port episode edit and delete flows.
- Port archive edit and delete flows.
- Preserve media rendering rules and CORS media behavior.
- Preserve archived article rendering with explicit `raw()` only at trusted/sanitized boundaries.
- Replace resolving status polling with htmx polling fragments.

Exit criteria:
- Episodes and archives workflows are server-rendered and htmx-driven.

Phase 5 progress:
- Added Fastify `/episodes/` GET route with cookie-auth login redirect, URL-backed pagination/filter params, `bid` compatibility, htmx `main` fragment rendering, feed-aware episode rows, and no Preact bundle reference.
- Added Fastify `/episodes/view/` GET and POST route with cookie-auth login redirect, missing-id redirect, full detail rendering, edit form rendering, form save handling, htmx episode-fragment responses, and parent-bookmark delete redirects.
- Added Fastify `/episodes/delete/` POST action route with no-JS redirects and htmx empty-fragment delete responses.
- Added route-local episode templates for list/detail cards, edit forms, metadata footers, resolving polling, deferred oEmbed activation, CORS media preview controls, and feed/bookmark links.
- Added API-owned episode helpers in `routes/api/episodes/episode-actions.js` and refactored JSON episode update/delete routes to reuse them.
- Added Fastify `/archives/` GET route with cookie-auth login redirect, URL-backed pagination/filter params, `bid` compatibility, htmx `main` fragment rendering, archive rows, and no Preact bundle reference.
- Added Fastify `/archives/view/` GET and POST route with cookie-auth login redirect, missing-id redirect, full article/detail rendering, edit form rendering, form save handling, htmx archive-fragment responses, and parent-bookmark delete redirects.
- Added Fastify `/archives/delete/` POST action route with no-JS redirects, htmx empty-fragment delete responses, and preserved 404 behavior for missing archives.
- Added route-local archive templates for list/detail cards, edit forms, metadata footers, resolving polling, bookmark links, and explicit `raw()` rendering at the stored sanitized article-content boundary.
- Added API-owned archive helpers in `routes/api/archives/archive-actions.js` and refactored JSON archive update/delete routes to reuse them.
- Added minimal browser enhancement in `assets/app.js` for deferred embeds, Twitter/Bluesky embed activation, and media preview/CORS retry behavior.
- Added `routes/episodes.test.js` and `routes/archives.test.js` coverage for anonymous redirects, empty pages, rows, htmx fragments, detail pages, edit saves, resolving polling fragments, and htmx deletes.
- Phase 5 is complete for the listed episode and archive routes.
- Verification passed for this slice:
  - `npm run test:tsc`
  - `npm run test:eslint -- --fix-dry-run`
  - `npm run build:assets`
  - `node --test routes/episodes.test.js routes/archives.test.js`
  - `node --test lib/htmx.test.js views/components/header.test.js routes/root.test.js routes/auth.test.js routes/bookmarks.test.js routes/search.test.js routes/tags.test.js routes/feeds.test.js routes/episodes.test.js routes/archives.test.js`

### Phase 6: Account And Admin
Goal: port settings and operational interfaces.

Account routes:
- `/account/`
- passkeys
- auth tokens
- username
- email
- password
- newsletter
- disabled state

Admin routes:
- `/admin/`
- `/admin/deps/`
- `/admin/flags/`
- `/admin/pgboss/`
- `/admin/redis-cache/`
- `/admin/stats/`
- `/admin/users/`
- `/admin/users/view/`

Tasks:
- Port account field view/edit fragments.
- Keep passkey flows with minimal browser JS for WebAuthn.
- Port auth token create/delete/list flows.
- Port admin flag form with color controls.
- Port user management rows and edit forms.
- Port pgboss/stats/redis views.
- Preserve admin authorization hooks.

Exit criteria:
- Account and admin pages are Fastify-rendered.
- Admin actions have route tests for authorization and htmx responses.

Phase 6 progress:
- Added Fastify `/account/` GET route with cookie-auth login redirect, server-rendered account fields, htmx `main` fragment rendering, and no Preact bundle reference.
- Added account HTML action routes for username, password, newsletter, and email update/resend/cancel flows:
  - `/account/username/`
  - `/account/password/`
  - `/account/newsletter/`
  - `/account/email/`
- Added API-owned `routes/api/user/user-actions.js` and refactored JSON `/api/user` PUT to reuse the shared user update mutation for username, password, newsletter, and service-notice dismissal updates.
- Kept email confirmation/update behavior owned by existing `routes/api/user/email/**` handlers; the HTML email action route delegates to those API endpoints so token generation and mail-side effects stay colocated with the email API.
- Added API-owned `routes/api/user/passkeys/passkey-actions.js` and refactored JSON passkey list/update/delete routes to reuse it.
- Added server-rendered passkey management to `/account/`:
  - passkey list with created, last-used, transport, and ID metadata
  - passkey rename and delete forms through `/account/passkeys/`
  - passkey registration form enhanced by `/assets/passkey-register.js`, which performs the WebAuthn browser ceremony against the existing API challenge/verify routes
  - no-JS registration fallback that returns an account error because WebAuthn requires browser APIs
- Added API-owned `routes/api/user/auth-tokens/auth-token-actions.js` and refactored JSON auth-token list/create/update/delete routes to reuse it.
- Added server-rendered auth-token management to `/account/`:
  - token list with current/protected/source status, browser/location/date metadata, and pagination
  - create form that renders the one-time API token value without exposing cookie auth state to frontend JS
  - edit form for token note/protection
  - revoke form that preserves current cookie session protection
- Added `/account/auth-tokens/` HTML action route for auth-token create/update/delete while keeping mutations colocated with the auth-token API helpers.
- Added Fastify-rendered admin routes:
  - `/admin/`
  - `/admin/deps/`
  - `/admin/flags/`
  - `/admin/redis-cache/`
  - `/admin/stats/`
  - `/admin/users/`
  - `/admin/users/view/`
  - `/admin/pgboss/`
- Added API-owned admin helpers for shared HTML/API behavior:
  - `routes/api/admin/flags/flag-actions.js`
  - `routes/api/admin/redis/redis-actions.js`
  - `routes/api/admin/users/admin-user-actions.js`
  - exported `loadAdminStats()` from `routes/api/admin/stats/get-admin-stats.js`
- Refactored JSON admin flags, Redis, and users routes to reuse those helpers.
- Added account and admin route styling under `assets/app.css`.
- Added `routes/account.test.js` coverage for anonymous redirect, authenticated rendering, htmx fragments, username updates, password updates, newsletter toggles, email update requests, passkey rendering, passkey updates, passkey deletion, passkey registration fallback, auth-token creation, auth-token updates, auth-token revocation, and current-session revocation protection.
- Added `routes/admin.test.js` coverage for anonymous redirect, non-admin rejection, admin index rendering, htmx admin fragments, flag rendering/update, stats/redis/deps rendering, admin user list/detail/update/delete, and pg-boss rendering.
- Phase 6 is complete.
- Verification passed for this slice:
  - `npm run test:tsc`
  - `npm run test:eslint -- --fix-dry-run`
  - `npm run build:assets`
  - `node --test routes/account.test.js`
  - `node --test routes/admin.test.js`
  - `node --test routes/api/admin/users/get-admin-users.test.js`
  - `node --test routes/account.test.js routes/root.test.js routes/api/user/passkeys/list-passkeys.test.js routes/api/user/passkeys/_id/update-passkey.test.js routes/api/user/passkeys/_id/delete-passkey.test.js`
  - `node --test routes/api/user/auth-tokens/*.test.js routes/api/user/auth-tokens/_jti/*.test.js`
  - `node --test lib/htmx.test.js views/components/header.test.js routes/root.test.js routes/auth.test.js routes/account.test.js routes/admin.test.js routes/bookmarks.test.js routes/search.test.js routes/tags.test.js routes/feeds.test.js routes/episodes.test.js routes/archives.test.js`

### Phase 7: Docs, Legal, Blog, Static Markdown
Goal: replace domstack markdown/page generation.

Routes:
- `/about/`
- `/docs/**`
- `/legal/**`
- `/blog/**`

Tasks:
- Choose markdown renderer and frontmatter convention.
- Move markdown source out of `client/**` into `content/**` or `views/content/**`.
- Preserve current URLs and canonical metadata.
- Port blog index/year index/post layouts.
- Preserve images under public paths.
- Regenerate or route sitemap entries from Fastify-side content inventory.
- Port syntax highlighting if still needed.

Exit criteria:
- All markdown/static pages are served by Fastify.
- domstack is no longer needed for docs/blog/legal/about.

### Phase 8: Generated Files And Feeds
Goal: replace all domstack templates.

Routes/files:
- `/robots.txt`
- `/sitemap.xml`
- `/opensearch.xml`
- `/giscus.json`
- `/manifest.webmanifest`
- `/service-worker.js`
- `/feed.json`
- `/feed.xml`

Tasks:
- Implement Fastify routes with correct content types.
- Reuse existing feed generation helpers where possible.
- Add route tests for content type and basic payload shape.
- Decide whether service worker remains. If it remains, generate it from source and include new asset names.

Exit criteria:
- No `*.template.js` domstack files remain.

### Phase 9: Remove Domstack And Preact
Goal: complete the cutover.

Tasks:
- Remove `build:domstack`, `watch:domstack`, and `domstack-watch`.
- Remove `@domstack/static`.
- Remove Preact dependencies after imports are gone:
  - `preact`
  - `htm`
  - `preact-render-to-string`
  - `@preact/signals`
  - `@tanstack/preact-query`
  - Preact-only test helpers/deps
- Remove old `packages/web/client/**` after moving static/content sources.
- Remove unused hooks, components, and tests tied to Preact.
- Update `tsconfig`, eslint ignore patterns, and `knip`.
- Run `pnpm run knip --dependencies` and fix unused deps.

Exit criteria:
- Clean build/test/knip.
- No domstack or Preact page code remains.

### Phase 10: Final Hardening
Goal: make the new app reliable and maintainable.

Tasks:
- Add high-value route integration tests for major flows.
- Add browser/manual QA checklist for htmx navigation and history.
- Check accessibility of forms/buttons/fragment swaps.
- Verify CSP still permits required scripts and blocks inline script.
- Verify caching headers for static assets.
- Verify `HX-Redirect` and normal redirects behave correctly.
- Verify no route accidentally returns JSON to browser HTML flows.
- Run production simulation with `npm run prod-sim`.

Exit criteria:
- Production simulation passes.
- Manual smoke test passes across anonymous, user, and admin sessions.

## Testing Strategy
- Unit tests for pure view/context helpers.
- Fastify injection tests for every new route family.
- Mutation tests for htmx actions:
  - success fragment
  - validation failure fragment
  - unauthorized response
  - disabled-user response where applicable
- Snapshot tests only for stable fragments where churn is low.
- Keep JSON API tests separate from HTML route tests.
- Run full test suite before removing old pages.

## Cutover Strategy
- Replace exact URLs with Fastify routes one family at a time.
- Leave old domstack output in `public` only for routes not yet ported.
- A route is considered ported when:
  - Fastify exact route exists.
  - Full-page and htmx responses are tested.
  - The old page bundle is no longer referenced.
  - Manual workflow parity is checked.
- Remove domstack only after every URL in the inventory has a Fastify replacement or intentional redirect.

## Risks
- This is large because domstack currently handles HTML rendering, markdown rendering, static copying, script/style discovery, and generated files.
- htmx 4 is beta.
- Some Preact hooks encode app state in local storage; those choices must move to URL params, cookies, form fields, or server state.
- Passkeys cannot be pure htmx because WebAuthn requires browser JavaScript.
- Archive article rendering needs careful `raw()` boundaries.
- Full no-JS fallback may be practical for forms but not for WebAuthn/passkeys.

## Open Decisions
- Markdown/content source location: `content/**` vs `views/content/**`.
- Asset cache-busting strategy after domstack removal.
- Whether to keep the service worker.
- Whether fragment choice should be inferred from `HX-Target` globally or selected explicitly in each route handler.
- How much browser-side enhancement is allowed beyond htmx for complex controls.
