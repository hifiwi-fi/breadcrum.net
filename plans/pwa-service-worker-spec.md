# PWA Service Worker Spec

This spec defines the intended behavior for Breadcrum's static PWA service
worker. It is written as an audit target: the implementation should be compared
against these requirements before release.

## Branch Coordination

- Breadcrum implementation branch: `pwa-cache-only`.
- Required Domstack branch: `staic-client-cache`.
- Breadcrum should keep using the local Domstack link only while the Domstack
  branch is unreleased. Before merging Breadcrum, replace the local link with a
  released `@domstack/static` version that contains the Domstack manifest and
  first-class service worker support.

## Scope

The service worker supports the static public Breadcrum client shell only. It
does not make server data, API responses, admin pages, mutations, uploads, or
third-party media available offline.

The static offline shell includes public app pages, docs, legal pages, auth
entry pages, CSS, JS, shared chunks, PWA icons, and the offline fallback page.
The first version intentionally excludes blog content and admin content.

Local development normally runs over `http://localhost`, which is valid for
service workers because loopback origins are treated as secure development
origins by browsers. Non-local deployments must use HTTPS.

## Terms

- **Domstack manifest**: Domstack's generated `domstack-manifest.json`, with
  revisioned output entries and a top-level `version`.
- **Static cache**: A versioned Cache Storage cache named from the Domstack
  manifest version.
- **Install cache**: A temporary cache used while validating a full static
  cache. It must be deleted after success or failure.
- **Active version**: The manifest version currently used for fetches.
- **Pending version**: A fully prepared static cache waiting for user-approved
  or clean-lifecycle activation.
- **Worker update**: A browser-detected update to `/service-worker.js`.
- **Cache-only update**: A new Domstack manifest version found by the active
  worker while the worker code itself has not changed.

## Build Contract

Domstack must emit a first-class service worker from
`packages/web/client/globals/service-worker.ts` to `/service-worker.js`.

Domstack must emit a revisioned manifest at `/domstack-manifest.json` for
one-shot builds. Watch mode must not emit or enable the manifest because stable
watch filenames are not representative of production cache invalidation.

Breadcrum should configure Domstack manifest filtering with
`packages/web/client/globals/domstack-manifest.settings.js`. The settings file
should exclude content that can never be part of the offline shell and should
call the shared Breadcrum PWA cache policy for the final include decision.

The client and service worker should consume Domstack's canonical PWA build
environment values:

- `DOMSTACK_MANIFEST_ENABLED`
- `DOMSTACK_MANIFEST_URL`
- `DOMSTACK_SERVICE_WORKER_URL`
- `DOMSTACK_SERVICE_WORKER_SCOPE`

The service worker must also defensively filter manifest entries at runtime. The
build-time manifest filter is an optimization and should not be the only safety
boundary.

## Cache Scope

The static precache must include:

- `/`
- Public app shell pages such as bookmarks, feeds, episodes, archives, tags,
  search, account, and auth entry pages.
- Docs and legal pages.
- `/login/`, `/register/`, `/password_reset/`, and
  `/password_reset/confirm/`, even though form submissions require network.
- `/offline/`.
- Same-origin CSS, JS, shared chunks, web workers, layout assets, global assets,
  PWA icons, and `manifest.webmanifest` needed by included pages.

The static precache must exclude:

- `/api/**`
- `/admin/**`
- `/blog/**` and blog-owned media/assets
- Source maps
- Domstack/esbuild metadata
- `/service-worker.js`
- `/domstack-manifest.json`
- Crawler/feed files such as feeds, sitemap, robots, and integration metadata
  unless a future offline use case explicitly needs them.

The cache policy must reject entries with missing revisions, cross-origin URLs,
page vars of `precache: false` or `offline: false`, metadata kinds, sourcemap
kinds, and any path or source relname under an excluded area.

## Install Lifecycle

On install, the worker must do nothing if the Domstack manifest is disabled.

When the manifest is enabled, install must:

1. Fetch `DOMSTACK_MANIFEST_URL` with `cache: 'no-store'` and
   `credentials: 'same-origin'`.
2. Validate that the manifest has a string `version` and an array `entries`.
3. Filter entries through Breadcrum's PWA cache policy.
4. Build a complete temporary install cache for the manifest version.
5. Fetch each included URL with `cache: 'reload'` and
   `credentials: 'same-origin'`.
6. Reject non-OK responses, redirected responses, and non-`basic` responses.
7. Hash each response body with SHA-256 and require it to match the manifest
   entry `revision`.
8. Copy the validated install cache into the final versioned static cache only
   after every entry succeeds.
9. Delete the install cache in both success and failure paths.

The install must be all-or-nothing. A failed install must leave the previous
active static cache and active version metadata untouched.

On first install with no active service worker, the worker may immediately mark
the new cache active and call `skipWaiting()`. With an existing active worker,
it must stage the new cache as pending and wait for user approval or a clean
lifecycle point.

## Activate Lifecycle

On activation, the worker must:

- Promote a valid pending version to active when the matching static cache
  exists.
- Delete pending metadata if the matching cache is missing.
- Delete old install caches.
- Delete outdated static caches while preserving the current active cache and
  any valid pending cache.
- Avoid deleting the only known static cache when metadata is missing or
  corrupted.
- Call `clients.claim()` after activation cleanup.

Malformed metadata must be deleted rather than trusted.

## Fetch Strategy

The worker may intercept only GET requests from the same origin.

These requests must remain network-only:

- Cross-origin requests
- Non-GET requests
- `/api` and `/api/**`
- `/admin` and `/admin/**`
- `DOMSTACK_MANIFEST_URL`

For navigations covered by the active cache, fetch must be cache-first. The
matcher should support clean URLs, trailing slash normalization, generated
`index.html` files, and ignored query strings.

For cached static assets, fetch must be cache-first with network fallback.

For excluded or uncached navigations while offline, the worker should return the
cached `/offline/` page. If that page is unavailable, it must return a small
inline `503` HTML response.

The worker must not cache failed API responses, redirects, opaque responses, or
runtime network responses in this iteration.

## Client Runtime

The browser runtime must register the service worker with:

```js
navigator.serviceWorker.register(serviceWorkerUrl, {
  scope: serviceWorkerScope,
  updateViaCache: 'none',
})
```

The runtime must check for updates:

- After registration.
- When the page becomes visible, throttled to a reasonable interval.
- When the browser comes back online, forced regardless of throttle.

An update check must:

1. Call `registration.update()`.
2. Surface `registration.waiting` as a worker update.
3. Avoid manifest cache checks while a new worker is installing.
4. Ask the controlling worker to check the Domstack manifest for cache-only
   updates.
5. Reset the throttle after failed update checks so online recovery is not
   delayed.

The runtime must not require a service-worker reply before the page can finish
booting. Worker messages should update UI state asynchronously.

## Message Protocol

The client may send:

- `SKIP_WAITING`: accept a waiting worker update.
- `CHECK_FOR_UPDATES`: ask the active worker to fetch the Domstack manifest and
  prepare a pending cache when the version changed.
- `APPLY_PENDING_CACHE`: promote a prepared cache-only update.

The worker may broadcast:

- `CACHE_UPDATE_READY` with `version`: a pending cache-only update is ready.
- `CACHE_UPDATE_CURRENT`: the active or pending cache already matches the
  current manifest.
- `CACHE_UPDATE_APPLIED` with `version`: a pending cache was promoted.
- `CACHE_UPDATE_FAILED` with `message`: manifest fetch, validation, or caching
  failed.

`CACHE_UPDATE_FAILED` must not delete the active cache. It should make the next
online or visible update check eligible to retry.

## Update UX

Breadcrum uses a hybrid update policy:

- Prompt while the page is visible.
- Apply immediately only when the user confirms.
- Auto-apply on clean `pagehide` when no form is dirty.
- Do not auto-apply while a form is dirty.
- Reload once after a waiting worker takes control.
- Reload once after a cache-only update is promoted.
- Respect "Later" dismissal for the current page session.

Worker updates should have priority over cache-only update notices. A
`CACHE_UPDATE_CURRENT` message must not clear an existing worker update notice.

Dirty form tracking should listen for form field input/change and clear on
submit. Future online-state handling for auth forms should disable or clearly
gate network-only submissions while offline.

## Local Development And Recovery

On local development origins, PWA behavior must be disabled by default unless a
developer explicitly opts in with:

```js
localStorage.setItem('breadcrum:pwa-dev', '1')
```

When disabled locally, the runtime must unregister Breadcrum service workers and
delete `breadcrum-*` caches so watch-mode development does not inherit stale
production caches.

`?reset-sw=1` must work in every environment. It must unregister same-origin
Breadcrum workers, delete `breadcrum-*` caches, remove the query parameter, and
reload.

The recovery path for poisoned caches is:

1. A bad new manifest or response fails validation and does not replace the
   active cache.
2. The active cache remains available.
3. `?reset-sw=1` can clear local worker/cache state.
4. A future `pwa-control.json` kill switch may be added if a shipped worker ever
   needs remote disable/unregister behavior.

## Server Headers

The static server must use PWA-aware cache headers:

- `/service-worker.js`: `Cache-Control: no-cache, no-store, must-revalidate`
- `/domstack-manifest.json`: `Cache-Control: no-cache`
- `/manifest.webmanifest`: `Cache-Control: no-cache`
- `/pwa-control.json` if added: `Cache-Control: no-cache`
- HTML: `Cache-Control: no-cache`
- Hashed JS/CSS/chunks/assets: long-lived immutable headers where safe.

These headers are part of the service worker contract. A stale
`/service-worker.js` or stale Domstack manifest can prevent browser update
detection or static cache freshness.

## Observability

The implementation should log enough detail for browser debugging:

- Registration failure
- Update check failure
- Manifest fetch failure
- Cache validation failure
- Cache promotion failure
- Reset failure

Production logs should stay concise. The Domstack PWA example may be noisier
than Breadcrum because it is a teaching/debugging fixture.

## Audit Checklist

Use this checklist to compare the current code against the spec:

- `pwa-cache-policy.js`: canonical Domstack manifest env names, excluded paths,
  excluded relnames, page var opt-outs, source maps, metadata, service worker,
  and crawler outputs.
- `domstack-manifest.settings.js`: build-time exclude/include hooks call the
  shared PWA cache policy.
- `service-worker.ts` and `service-worker/events.ts`: install, activate, fetch,
  and message event wiring.
- `service-worker/manifest.ts`: manifest fetch, no-store behavior, and shape
  validation.
- `service-worker/precache.ts`: all-or-nothing install cache, response
  validation, SHA-256 revision checks, pending vs active handling, serialized
  cache preparations.
- `service-worker/cache.ts`: active/pending metadata, malformed metadata
  cleanup, stale cache cleanup, poison-cache preservation.
- `service-worker/fetch.ts`: network-only exclusions, navigation normalization,
  cache-first static strategy, offline fallback behavior.
- `service-worker/messages.ts`: worker message protocol, retry-friendly failure
  reporting, no active-cache deletion on failure.
- `pwa-runtime.js`: registration, local dev opt-in, reset path, update checks,
  dirty-form lifecycle, prompt/dismiss/apply behavior, reload behavior.
- Header PWA component: update notice events, accessible controls, session
  dismissal.
- `plugins/static.js`: service-worker, Domstack manifest, webmanifest, HTML, and
  immutable asset cache headers.

## Acceptance Tests

Before release, verify:

- A production build emits `/service-worker.js` and `/domstack-manifest.json`.
- The manifest excludes admin, blog, source maps, metadata, service worker, and
  crawler/feed outputs.
- First visit installs the worker and builds an active static cache.
- Reload offline renders `/`, app pages, docs, legal, auth pages, and
  `/offline/`.
- Offline `/api/**` and `/admin/**` are not served from the static cache.
- Offline excluded navigations get `/offline/` or the inline `503` fallback.
- A worker-code update shows the update prompt and reloads once after apply.
- A cache-only manifest update shows the update prompt and reloads once after
  apply.
- Dismissing an update hides it for the current page session.
- Dirty forms prevent pagehide auto-activation.
- Failed manifest or revision validation leaves the active cache usable and
  retries on the next forced update check.
- `?reset-sw=1` clears workers and `breadcrum-*` caches.
