# Static PWA Offline Cache Plan

## Status snapshot

- Shared starting point: the Domstack v12 migration commit.
- Breadcrum should use Domstack's first-class service-worker and manifest hook pattern.
- Domstack should inject the finalized PWA policy directly into `/service-worker.js` with `context.defineServiceWorkerConstant()`.
- The service worker should not fetch a runtime Domstack manifest.
- The service-worker bundle should be the update boundary the browser detects.
- This plan compares the two implementation branches: Workbox and vanilla Cache Storage.

## Shared architecture

### Build time

- `packages/web/client/globals/domstack-manifest/domstack-manifest.settings.ts` configures Domstack's manifest.
- `manifestVars: ['offline', 'precache']` exposes the page/layout/global/default variable cascade to manifest entries.
- `includeEntry` calls Breadcrum's shared PWA cache policy.
- `manifestBuilt` converts the Domstack manifest into a small service-worker policy.
- The hook injects that policy into the final service-worker build.
- Domstack omits `/service-worker.js` from the manifest and injects the finalized manifest version into the service-worker bundle.

### Runtime client

- `packages/web/client/globals/pwa-runtime.js` registers `/service-worker.js` when Domstack's manifest is enabled.
- It disables and cleans up service-worker state in normal local watch mode unless `localStorage.setItem('breadcrum:pwa-dev', '1')` is set.
- It supports `?reset-sw=1` for recovery.
- It checks for service-worker updates after registration, on visibility regain, and when coming online.
- It shows the header update notice only when a new service-worker bundle is waiting.
- It does not check for cache-only manifest updates because the policy is bundled into the service worker.

## Cache scope

Precache by default:

- Public app shell pages.
- Docs and legal pages.
- Auth entry pages such as login, register, and password reset pages.
- `/offline/`.
- Same-origin CSS, JS, shared chunks, web workers, layout assets, global assets, PWA icons, and `manifest.webmanifest` needed by included pages.

Exclude:

- `/api/**`.
- `/admin/**`.
- `/blog/**` and blog-owned media/assets.
- Source maps.
- Domstack/esbuild metadata.
- `/service-worker.js`.
- `/domstack-manifest.json`.
- Feeds, sitemap, robots, and integration metadata unless a future offline use case needs them.

## Workbox branch

Branch: `pwa-cache-only`.

The Workbox branch delegates precaching, route matching, old-cache cleanup, and offline fallback behavior to Workbox helpers.

Its service worker uses:

- `precacheAndRoute()` for the injected precache manifest.
- `cleanupOutdatedCaches()` for Workbox-managed old precache cleanup.
- `offlineFallback()` for failed offline navigations.
- `NetworkOnly` routing for navigation fallback behavior.

Benefits:

- Battle-tested precaching and URL matching semantics.
- Less Breadcrum-owned service-worker logic.
- Easier path to future runtime strategies such as `NetworkFirst`, `CacheFirst`, or `StaleWhileRevalidate`.
- Standard PWA conventions and fewer custom lifecycle edge cases.

Costs:

- Adds Workbox dependencies.
- Produces a larger generated service-worker bundle.
- Introduces Workbox cache naming and implementation details into debugging.
- Hides some behavior behind Workbox abstractions.

## Vanilla branch

Branch: `pwa-cache-only-vanilla`.

The vanilla branch implements the static cache directly with Cache Storage.

Its service worker:

- Opens a versioned precache named from the injected manifest version.
- Uses `cache.addAll()` during install to fill the versioned cache.
- Deletes older Breadcrum-owned caches during activation.
- Serves same-origin GET requests cache-first when a precached response exists.
- Falls back to the network when a request is not precached.
- Returns the cached `/offline/` page for failed navigations.
- Keeps `/api/**` and `/admin/**` network-only.

Benefits:

- No Workbox dependency.
- Smaller generated service-worker bundle.
- Fully explicit cache naming, matching, fallback, and cleanup behavior.
- Easier local debugging because there are fewer framework conventions.
- Good fit if Breadcrum only needs a static precache shell.

Costs:

- Breadcrum owns service-worker edge cases that Workbox normally handles.
- URL matching, ignored search params, clean URLs, install failure semantics, and cleanup safety need browser smoke testing.
- Future runtime caching strategies would need custom implementation or a later Workbox migration.

## Comparison

| Area | Workbox | Vanilla |
| --- | --- | --- |
| Dependencies | Adds Workbox packages | No Workbox packages |
| Service-worker source | Smaller app code | More app-owned code |
| Generated bundle | Larger | Smaller |
| Precaching semantics | Battle-tested | Breadcrum-owned |
| URL matching | Workbox handles more edge cases | Custom matcher handles current needs |
| Cache cleanup | Workbox helper plus prefix cleanup | Manual prefix cleanup |
| Offline fallback | Workbox recipe | Manual fallback response |
| Debuggability | More abstraction | More explicit |
| Future runtime caching | Easy to add standard strategies | Custom work required |
| Main risk | Dependency abstraction and cache naming | Bugs in custom service-worker logic |

## Recommendation

Prefer the vanilla branch if browser smoke testing passes.

The current Breadcrum PWA goal is a static offline shell with no progressive runtime caching, offline server data, mutation replay, background sync, or IndexedDB persistence.

Domstack already gives us a finalized build-time policy and version, so the service worker does not need most of Workbox's higher-level machinery yet.

Use the Workbox branch instead if manual testing exposes URL matching or lifecycle edge cases, or if we expect to add runtime caching strategies soon.

## Manual browser smoke checklist

- Build with `pnpm run serve` from the repository root.
- On localhost, opt in with `localStorage.setItem('breadcrum:pwa-dev', '1')` before testing service-worker behavior.
- Verify the service worker registers and reaches an active state.
- Switch offline and reload `/`, `/bookmarks/`, `/docs/`, `/legal/`, auth entry pages, and `/offline/`.
- Verify excluded navigations such as `/blog/`, `/admin/`, and `/api/` are not served from the precache.
- Build a second version and verify the browser detects a waiting worker and the header update notice can apply it.
- Switch from `serve` to `watch`, reload, and verify Breadcrum-owned PWA caches are cleared.
- Use `?reset-sw=1` to verify manual recovery unregisters workers and clears Breadcrum-owned caches.
