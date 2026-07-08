/// <reference lib="webworker" />

import { clientsClaim, setCacheNameDetails } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  precacheAndRoute,
} from 'workbox-precaching'
import { offlineFallback } from 'workbox-recipes'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'
import {
  cachePrefix,
  cachePrefixes,
  type BreadcrumWorkboxPolicy,
} from './service-worker-settings.ts'

/**
 * Workbox-powered static PWA service worker for Breadcrum.
 *
 * Domstack injects the finalized precache policy into this bundle after the
 * output manifest is built, so the worker does not fetch a runtime manifest.
 */

export {}

declare const self: ServiceWorkerGlobalScope

declare const __BREADCRUM_WORKBOX_POLICY__: BreadcrumWorkboxPolicy

const manifestEnabled = process.env['DOMSTACK_MANIFEST_ENABLED'] === 'true'
const manifestVersion = process.env['DOMSTACK_MANIFEST_VERSION'] ?? ''

setCacheNameDetails({ prefix: cachePrefix })

if (manifestEnabled) {
  const policy = __BREADCRUM_WORKBOX_POLICY__

  if (manifestVersion && policy.version !== manifestVersion) {
    throw new Error('Generated Workbox policy version does not match the bundled Domstack manifest version.')
  }

  cleanupOutdatedCaches()
  precacheAndRoute(policy.precacheManifest, {
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  })

  registerRoute(
    ({ request, url }) => request.mode === 'navigate' && !isNetworkOnlyNavigation(url),
    new NetworkOnly()
  )

  offlineFallback({
    pageFallback: policy.offlineFallbackUrl,
  })

  clientsClaim()

  self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
      event.waitUntil(self.skipWaiting())
      return
    }

    if (event.data?.type === 'RESET_SERVICE_WORKER') {
      event.waitUntil(resetServiceWorker())
    }
  })
} else {
  clientsClaim()

  self.addEventListener('install', () => {
    self.skipWaiting()
  })

  self.addEventListener('activate', event => {
    event.waitUntil(resetServiceWorker())
  })
}

async function resetServiceWorker (): Promise<void> {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter(name => cachePrefixes.some(cachePrefix => name.startsWith(cachePrefix)))
      .map(name => caches.delete(name))
  )
}

function isNetworkOnlyNavigation (url: URL): boolean {
  return url.pathname === '/api' ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/admin' ||
    url.pathname.startsWith('/admin/')
}
