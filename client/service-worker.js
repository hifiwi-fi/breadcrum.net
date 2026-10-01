/// <reference lib="dom" />

/** @import { ServiceWorkerPolicy } from './lib/service-worker-policy.js' */

// Watch builds do not run manifest hooks, so they have no version or asset inventory.
const injectedPolicy = /** @type {typeof globalThis & { BREADCRUM_SERVICE_WORKER_POLICY?: ServiceWorkerPolicy }} */ (globalThis).BREADCRUM_SERVICE_WORKER_POLICY
const policy = Object.freeze({
  mode: 'network-only',
  version: injectedPolicy?.version ?? null,
  publicAssets: Object.freeze((injectedPolicy?.publicAssets ?? []).map(asset => Object.freeze(asset))),
})

// Network-only is intentional: no fetch interception, precaching, or offline fallback.
// Keep runtime imports/exports out so the existing classic worker registration still works.
self.addEventListener('install', () => {
  console.log('Service worker installed', policy)
})
