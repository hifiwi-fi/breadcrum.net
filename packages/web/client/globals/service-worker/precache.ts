/// <reference lib="webworker" />

import { ACTIVE_VERSION_REQUEST, PENDING_VERSION_REQUEST } from './constants.ts'
import {
  cacheExists,
  cleanupCaches,
  deleteMetaVersion,
  getInstallCacheName,
  getMetaVersion,
  getStaticCacheName,
  setMetaVersion,
} from './cache.ts'
import { fetchOutputManifest, shouldPrecacheEntry } from './manifest.ts'
import { serviceWorker } from './context.ts'
import type { BuildOutputEntry, PrepareLatestManifestCacheResult } from './types.ts'

let latestManifestCachePreparation = Promise.resolve()

/**
 * Fetch the latest manifest and prepare or apply the matching static cache.
 */
export async function prepareLatestManifestCache ({ apply }: { apply: boolean }): Promise<PrepareLatestManifestCacheResult | null> {
  const run = latestManifestCachePreparation.then(() => prepareLatestManifestCacheDirect({ apply }))
  latestManifestCachePreparation = run.then(() => undefined, () => undefined)
  return run
}

/**
 * Run one manifest cache preparation after any earlier preparation finishes.
 */
async function prepareLatestManifestCacheDirect ({ apply }: { apply: boolean }): Promise<PrepareLatestManifestCacheResult | null> {
  const manifest = await fetchOutputManifest()
  const activeVersion = await getMetaVersion(ACTIVE_VERSION_REQUEST)

  if (manifest.version === activeVersion && await cacheExists(getStaticCacheName(manifest.version))) {
    await deleteMetaVersion(PENDING_VERSION_REQUEST)
    return {
      current: true,
      version: manifest.version,
    }
  }

  const pendingVersion = await getMetaVersion(PENDING_VERSION_REQUEST)
  if (!apply && manifest.version === pendingVersion && await cacheExists(getStaticCacheName(manifest.version))) {
    return {
      current: false,
      version: manifest.version,
    }
  }

  const entries = manifest.entries.filter(shouldPrecacheEntry)
  await precacheEntries(manifest.version, entries)

  if (apply) {
    await setMetaVersion(ACTIVE_VERSION_REQUEST, manifest.version)
    await deleteMetaVersion(PENDING_VERSION_REQUEST)
    await cleanupCaches()
  } else {
    await setMetaVersion(PENDING_VERSION_REQUEST, manifest.version)
  }

  return {
    current: false,
    version: manifest.version,
  }
}

/**
 * Build a complete versioned static cache through a temporary install cache.
 */
async function precacheEntries (version: string, entries: BuildOutputEntry[]) {
  const installCacheName = getInstallCacheName(version) + '-' + createInstallCacheRunId()
  const finalCacheName = getStaticCacheName(version)

  await caches.delete(installCacheName)
  const installCache = await caches.open(installCacheName)

  try {
    for (const entry of entries) {
      await precacheEntry(installCache, entry)
    }

    await caches.delete(finalCacheName)
    const finalCache = await caches.open(finalCacheName)
    const requests = await installCache.keys()

    for (const request of requests) {
      const cached = await installCache.match(request)
      if (cached) await finalCache.put(request, cached)
    }
  } finally {
    await caches.delete(installCacheName)
  }
}

/**
 * Fetch, validate, and store one manifest entry in the install cache.
 */
async function precacheEntry (cache: Cache, entry: BuildOutputEntry) {
  const request = new Request(new URL(entry.url, serviceWorker.location.origin), {
    credentials: 'same-origin',
  })
  const response = await fetch(request, {
    cache: 'reload',
    credentials: 'same-origin',
  })

  validatePrecacheResponse(entry, response)
  await validateRevision(entry, response.clone())
  await cache.put(request, response)
}

/**
 * Reject responses that are unsafe or unsuitable for the static precache.
 */
function validatePrecacheResponse (entry: BuildOutputEntry, response: Response) {
  if (!response.ok) {
    throw new Error('Unable to precache ' + entry.url + ': ' + response.status + ' ' + response.statusText)
  }

  if (response.redirected) {
    throw new Error('Refusing redirected precache response for ' + entry.url)
  }

  if (response.type !== 'basic') {
    throw new Error('Refusing non-basic precache response for ' + entry.url + ': ' + response.type)
  }
}

/**
 * Verify that a fetched response body matches the manifest revision hash.
 */
async function validateRevision (entry: BuildOutputEntry, response: Response) {
  if (typeof entry.revision !== 'string') {
    throw new Error('Missing revision for ' + entry.url)
  }

  if (!crypto.subtle) {
    throw new Error('SubtleCrypto is required to validate ' + entry.url)
  }

  const actualRevision = await hashResponse(response)
  if (actualRevision !== entry.revision) {
    throw new Error('Revision mismatch for ' + entry.url)
  }
}

/**
 * Hash a response body with SHA-256 in the browser.
 */
async function hashResponse (response: Response) {
  const buffer = await response.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = Array.from(new Uint8Array(digest))
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a per-run suffix so overlapping workers never share an install cache.
 */
function createInstallCacheRunId () {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}
