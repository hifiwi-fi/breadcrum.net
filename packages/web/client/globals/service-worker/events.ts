/// <reference lib="webworker" />

import { ACTIVE_VERSION_REQUEST, PENDING_VERSION_REQUEST } from './constants.ts'
import { DOMSTACK_OUTPUT_MANIFEST_ENABLED } from '../pwa-cache-policy.js'
import { applyPendingCache, cacheExists, cleanupCaches, deleteMetaVersion, getMetaVersion, getStaticCacheName, setMetaVersion } from './cache.ts'
import { checkForManifestUpdate } from './messages.ts'
import { handleFetch, shouldHandleRequest } from './fetch.ts'
import { prepareLatestManifestCache } from './precache.ts'
import { serviceWorker } from './context.ts'
import type { WorkerMessage } from './types.ts'

export { handleFetch, shouldHandleRequest }

/**
 * Prepare the static cache during service worker installation.
 */
export async function handleInstall () {
  if (!DOMSTACK_OUTPUT_MANIFEST_ENABLED) return

  const hasActiveWorker = Boolean(serviceWorker.registration.active)
  const result = await prepareLatestManifestCache({ apply: !hasActiveWorker })

  if (!hasActiveWorker && result) {
    await serviceWorker.skipWaiting()
  }
}

/**
 * Promote a valid pending cache and remove stale caches during activation.
 */
export async function handleActivate () {
  const pendingVersion = await getMetaVersion(PENDING_VERSION_REQUEST)
  if (pendingVersion) {
    if (await cacheExists(getStaticCacheName(pendingVersion))) {
      await setMetaVersion(ACTIVE_VERSION_REQUEST, pendingVersion)
    }
    await deleteMetaVersion(PENDING_VERSION_REQUEST)
  }

  await cleanupCaches()
  await serviceWorker.clients.claim()
}

/**
 * Dispatch client messages to the matching service worker lifecycle action.
 */
export function handleMessage (event: ExtendableMessageEvent) {
  if (!DOMSTACK_OUTPUT_MANIFEST_ENABLED) return

  const message = event.data as WorkerMessage | undefined

  if (message?.type === 'SKIP_WAITING') {
    event.waitUntil(serviceWorker.skipWaiting())
    return
  }

  if (message?.type === 'CHECK_FOR_UPDATES') {
    event.waitUntil(checkForManifestUpdate())
    return
  }

  if (message?.type === 'APPLY_PENDING_CACHE') {
    event.waitUntil(applyPendingCache())
  }
}
