# Static PWA Offline Cache Plan

## Status snapshot
- Breadcrum implementation branch: `pwa-cache-only`.
- Upstream Domstack dependency branch: `staic-client-cache`.
- Breadcrum registers `/service-worker.js` from `packages/web/client/globals/global.client.js`.
- `packages/web/client/globals/service-worker.ts` is a first-class Domstack service worker source that builds to `/service-worker.js`.
- `packages/web/client/manifest.webmanifest.template.js` emits `manifest.webmanifest`.
- The client is a static domstack MPA under `packages/web/client`; API/data requests go to `/api/**`.
- `packages/web/plugins/static.js` serves `packages/web/public` at `/`, gives PWA control files no-cache headers, and separately protects `/admin/**` static files with JWT + admin auth.
- The Domstack `staic-client-cache` branch adds `domstack-output-manifest.json`, schema-backed manifest types, and first-class site service worker builds.
- Domstack writes the output manifest for one-shot builds only. Watch mode intentionally does not emit it because stable watch filenames are not representative of production cache invalidation.
- Breadcrum uses a local `link:../../../domstack` dependency while this work is in flight, then should move back to a released `@domstack/static` version after the Domstack PR lands.
- Review order: land or release Domstack `staic-client-cache` first, then update Breadcrum `pwa-cache-only` to consume the released Domstack package instead of the local link.

## Current implementation status
- Done: local Domstack link, Breadcrum `manifest.settings.js` filtering, runtime manifest service worker, update notice, `?reset-sw=1`, localhost cleanup with `breadcrum:pwa-dev` opt-in, offline fallback page, and PWA-sensitive static headers.
- Done: production-style build emits `packages/web/public/service-worker.js` from `client/globals/service-worker.ts`.
- Done: production-style build emits `packages/web/public/domstack-output-manifest.json` with no `/admin/**`, `/blog/**`, source map, metadata, or service worker entries.
- Done: Domstack root URL exclude bug fixed upstream on the `staic-client-cache` branch.
- Done: Domstack first-class service worker support merged into the `staic-client-cache` branch.
- Detailed worker behavior spec: `./pwa-service-worker-spec.md`.
- Remaining: browser smoke testing of install/update/offline flows in Chromium and Safari.
- Remaining: richer online/offline form state for auth and password reset submissions.

## Goals
- Make the static, public Breadcrum client shell work offline as a PWA.
- Precache the static MPA pages and all same-origin assets needed to render them.
- Include docs, legal, login, register, and password reset pages in the first offline bundle.
- Exclude server/data state from this iteration; `/api/**` stays network-only.
- Exclude protected `/admin/**` files from the default precache.
- Exclude `/blog/**` HTML and colocated blog media initially to keep cache size and update churn under control.
- Provide full service-worker lifecycle support: install, activate, update available notification, controlled activation, old cache cleanup, local development safety, and recovery from poisoned/bad caches.
- Consume Domstack's reusable output manifest directly instead of maintaining a separate Breadcrum file scanner.

## Non-goals
- Offline bookmarks/archives/episodes data model, sync queue, mutation replay, or IndexedDB persistence.
- Runtime caching for third-party media, embeds, analytics, or external images.
- Offline access to admin pages.
- Offline blog archive support in the first pass.

## Cache scope
Precache these by default:
- Public app/documentation/legal HTML outside `/blog/**` and `/admin/**`.
- Root page `/`, app shells like `/bookmarks/`, `/feeds/`, `/episodes/`, `/archives/`, `/tags/`, `/search/**`, auth/account pages, docs, and legal pages.
- CSS/JS entry bundles referenced by included pages.
- Shared esbuild chunks under `/chunks/**`.
- Layout/global CSS and JS under `/globals/**` and `/layouts/**`.
- PWA assets: `/manifest.webmanifest`, favicons, app icons, screenshots, and core `/static/**` images not under `/blog/**`.
- `favicon.ico`, `opensearch.xml`, and other small public support files when useful.
- A tiny `/offline/` fallback page for excluded offline navigations.

Do not precache:
- `/api/**`, non-GET requests, and cross-origin requests.
- `/admin/**`.
- `/blog/**` and `packages/web/client/blog/**` copied assets.
- Source maps, Domstack/esbuild metadata files, feeds, sitemap, robots, and other crawler outputs unless there is a clear offline use.
- Responses that are redirected, opaque, non-200, or not same-origin `basic` responses.

Decisions:
- Docs and legal pages are in scope for the first offline bundle.
- Auth/account entry pages, including `/login/`, `/register/`, `/password_reset/`, and `/password_reset/confirm/`, are in scope even though form submissions require the network.
- Source maps should never be precached, including non-production builds.
- Use a hybrid update policy: prompt while the current page is visible, auto-apply only at clean lifecycle points, and keep forced update/recovery paths for poisoned-cache situations.

## Target architecture

### 1. Domstack output manifest
Breadcrum should depend on Domstack's generated `public/domstack-output-manifest.json`:

```json
{
  "$schema": "https://unpkg.com/@domstack/static@11.0.3/lib/build-output-manifest/schema.json",
  "version": "sha256-of-cache-relevant-output-metadata",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "entries": [
    {
      "outputRelname": "bookmarks/index.html",
      "url": "/bookmarks/",
      "revision": "sha256-file-content",
      "bytes": 1234,
      "kind": "page"
    }
  ]
}
```

The Breadcrum service worker should fetch this manifest during `install` with `cache: 'no-store'` and filter it into the PWA cache scope. The worker can treat the manifest as the source of truth and does not need template access to the final output list.
Domstack's `version` changes when cache-relevant fields change (`url`, `revision`, `kind`, or page-level `precache` / `offline` vars), while source metadata is ignored.

### 2. Service worker strategy
- Cache names:
  - `breadcrum-static-${manifest.version}` for the active static precache.
  - `breadcrum-static-install-${manifest.version}` as a temporary install cache.
- `install`:
  - Fetch `/domstack-output-manifest.json` with `cache: 'no-store'`.
  - Filter manifest entries to the Breadcrum static offline scope.
  - Fetch every included URL with `cache: 'reload'` and `credentials: 'same-origin'`.
  - Require `response.ok`, `response.type === 'basic'`, and no redirects.
  - Verify each response body against the Domstack SHA-256 revision before committing it to Cache Storage.
  - Fail the install if any required entry fails validation, leaving the current worker/cache active.
  - Call `skipWaiting()` only on first install when there is no existing controller.
- `activate`:
  - Treat `breadcrum-static-${manifest.version}` as the only active static cache for this worker version.
  - Delete leftover install caches and older `breadcrum-static-*` caches.
  - Call `clients.claim()` after activation.
- `fetch`:
  - For non-GET, `/api/**`, `/admin/**`, and cross-origin requests: network-only.
  - For included navigation URLs: cache-first from the active static cache, with network fallback when the cache is missing.
  - For included static assets: cache-first with network fallback.
  - For excluded navigations while offline: return cached `/offline/` if available, otherwise return a small generated `503` HTML response.

### 3. Client lifecycle and update UX
Extend `packages/web/client/globals/global.client.js` or a small imported module:
- Register with `navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })`.
- Call `registration.update()` on initial load, when the tab regains visibility after a reasonable interval, and when the browser returns online.
- Detect `registration.waiting` and `updatefound`.
- Send a custom event or signal to the global header when an update is waiting.
- Present a small update notice with actions:
  - Apply now: post `{ type: 'SKIP_WAITING' }` to the waiting worker.
  - Later: dismiss for the current session.
- Listen for `controllerchange` and reload once after the new worker activates.
- Apply automatically when it is low-risk:
  - On next navigation/page load.
  - On `pagehide` for pages without dirty form state.
  - When there are no controlled visible clients.
- Track dirty form state with `input`, `change`, `submit`, and `beforeunload`/`pagehide` signals so automatic activation does not interrupt form work.

### 4. Development behavior
- Disable production PWA precaching by default on local development origins such as `localhost`, `127.0.0.1`, and `[::1]`.
- On local dev origins, unregister existing Breadcrum service workers and delete `breadcrum-*` caches unless an explicit development opt-in is set.
- Keep `?reset-sw=1` working in every environment so stale local caches can be cleared without DevTools.
- Add an explicit PWA test mode, such as `localStorage.setItem('breadcrum:pwa-dev', '1')`, for developers who intentionally want service-worker behavior on localhost.
- Test offline/PWA lifecycle with a production-style build and server, not normal `domstack --watch`.

### 5. Server cache headers
Update `packages/web/plugins/static.js` so service-worker-sensitive files are not trapped behind the current 10-minute static max-age:
- `/service-worker.js`: `Cache-Control: no-cache, no-store, must-revalidate`.
- `/manifest.webmanifest`, `/domstack-output-manifest.json`, and any PWA control file: `Cache-Control: no-cache`.
- HTML: `Cache-Control: no-cache`, because filenames are stable.
- Hashed JS/CSS/chunks/images: long-lived immutable headers where filename hashes are present.
- Non-hashed static images/icons can keep a moderate max-age, because the service worker revision manifest handles app offline freshness.

## Implementation checklist

### Phase 1: Local Domstack manifest
- Link `@domstack/static` to `/Users/bret/Developer/domstack` while the Domstack manifest branch is unreleased.
- Add Breadcrum `manifest.settings.js` filtering in `packages/web/client/globals/manifest.settings.js` to exclude `/blog/**`, `/admin/**`, source maps, crawler outputs, and Domstack metadata from the manifest when possible.
- Keep the service worker's own filter as a second safety boundary.
- Verify `pnpm --filter @breadcrum/web build:domstack` emits `packages/web/public/domstack-output-manifest.json`.

### Phase 2: Service worker
- Replace the install-only worker with `packages/web/client/globals/service-worker.ts`.
- Keep `manifest.webmanifest` generation in `packages/web/client/manifest.webmanifest.template.js`.
- Fetch and validate `domstack-output-manifest.json` during worker install.
- Implement install, activate, fetch, and message handlers.
- Keep `/api/**`, `/admin/**`, and cross-origin requests network-only.
- Add a small `/offline/` page for excluded offline navigations.

### Phase 3: Client update flow
- Move service worker registration into a focused module imported by `globals/global.client.js`.
- Expose update state to the header via a custom event.
- Add update notice UI to `packages/web/client/components/header/index.js`.
- Implement "Apply update" via `postMessage({ type: 'SKIP_WAITING' })`.
- Reload once on `controllerchange`.
- Add shared online/offline state so auth and password reset pages can render offline shells while disabling or clearly gating network-only form submissions in a later data-model pass.

### Phase 4: Development safety and recovery
- Implement local development cleanup and explicit PWA test opt-in.
- Implement `?reset-sw=1` unregister/cache-delete recovery.
- Add per-file cache headers in `packages/web/plugins/static.js`.
- Optionally add `/pwa-control.json` later if a shipped worker needs remote kill-switch behavior.
- Log service-worker install/activation/cache failures with enough context for browser debugging.

### Phase 5: Verification
- Unit test the manifest filter and URL normalization where practical.
- Build with the local Domstack link and inspect the generated manifest.
- Confirm `packages/web/public/service-worker.js` is emitted by esbuild and appears in `domstack-esbuild-meta.json`, while Breadcrum's filtered `domstack-output-manifest.json` excludes it from the precache list.
- Run `pnpm --filter @breadcrum/web test:tsc` and `pnpm --filter @breadcrum/web test:eslint`.
- Add a Playwright smoke test in a later pass:
  - Build and serve the production app.
  - Visit `/bookmarks/`, wait for `navigator.serviceWorker.ready`.
  - Switch browser context offline.
  - Reload `/bookmarks/`, `/docs/`, and `/legal/`; assert static shell renders.
  - Assert `/blog/` and `/admin/` are not served from the precache.
  - Build a second version, verify an update notice appears and applying it reloads into the new cache.
- Manual browser checks in Chromium and Safari:
  - Install PWA.
  - Launch offline.
  - Confirm app shell, icons, manifest, and navigation are available.
  - Confirm API-backed views degrade without attempting to cache failed API responses.

## Open decisions
- None.
