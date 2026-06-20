/// <reference lib="webworker" />

import {
  ACTIVE_VERSION_REQUEST,
  INSTALL_CACHE_PREFIX,
  META_CACHE,
  PENDING_VERSION_REQUEST,
  STATIC_CACHE_PREFIX,
} from './constants.ts'
import { postToClients } from './clients.ts'

/**
 * Promote a fully prepared pending cache so fetches start using it.
 */
export async function applyPendingCache () {
  const pendingVersion = await getMetaVersion(PENDING_VERSION_REQUEST)
  if (!pendingVersion) return

  const pendingCacheName = getStaticCacheName(pendingVersion)
  if (!await cacheExists(pendingCacheName)) {
    await deleteMetaVersion(PENDING_VERSION_REQUEST)
    return
  }

  await setMetaVersion(ACTIVE_VERSION_REQUEST, pendingVersion)
  await deleteMetaVersion(PENDING_VERSION_REQUEST)
  await cleanupCaches()

  await postToClients({
    type: 'CACHE_UPDATE_APPLIED',
    version: pendingVersion,
  })
}

/**
 * Resolve the active static cache, clearing stale active metadata if needed.
 */
export async function getActiveCacheName () {
  const activeVersion = await getMetaVersion(ACTIVE_VERSION_REQUEST)
  const cacheNames = await caches.keys()
  if (activeVersion) {
    const activeCacheName = getStaticCacheName(activeVersion)
    if (cacheNames.includes(activeCacheName)) return activeCacheName
    await deleteMetaVersion(ACTIVE_VERSION_REQUEST)
  }

  const staticCacheNames = cacheNames.filter(name => name.startsWith(STATIC_CACHE_PREFIX))
  return staticCacheNames[0] || null
}

/**
 * Remove old install caches and outdated static caches without deleting the only known good cache.
 */
export async function cleanupCaches () {
  const cacheNames = await caches.keys()
  const activeCacheName = await getExistingMetaCacheName(ACTIVE_VERSION_REQUEST, cacheNames)
  const pendingCacheName = await getExistingMetaCacheName(PENDING_VERSION_REQUEST, cacheNames)
  const hasKnownStaticCache = Boolean(activeCacheName || pendingCacheName)
  const keep = new Set([
    META_CACHE,
    activeCacheName ?? '',
    pendingCacheName ?? '',
  ].filter(Boolean))

  await Promise.all(cacheNames.map(cacheName => {
    if (!cacheName.startsWith(STATIC_CACHE_PREFIX) && !cacheName.startsWith(INSTALL_CACHE_PREFIX)) {
      return undefined
    }

    if (!hasKnownStaticCache && cacheName.startsWith(STATIC_CACHE_PREFIX)) return undefined
    if (keep.has(cacheName)) return undefined
    return caches.delete(cacheName)
  }))
}

/**
 * Check whether Cache Storage currently contains a named cache.
 */
export async function cacheExists (cacheName: string) {
  const cacheNames = await caches.keys()
  return cacheNames.includes(cacheName)
}

/**
 * Read a version marker from the metadata cache, deleting malformed metadata.
 */
export async function getMetaVersion (requestUrl: string) {
  const cache = await caches.open(META_CACHE)
  const response = await cache.match(requestUrl)
  if (!response) return null

  try {
    const data = await response.json()
    if (typeof data.version === 'string') return data.version
  } catch {}

  await cache.delete(requestUrl)
  return null
}

/**
 * Store a version marker in the metadata cache.
 */
export async function setMetaVersion (requestUrl: string, version: string) {
  const cache = await caches.open(META_CACHE)
  await cache.put(requestUrl, new Response(JSON.stringify({ version }), {
    headers: {
      'content-type': 'application/json',
    },
  }))
}

/**
 * Remove a version marker from the metadata cache.
 */
export async function deleteMetaVersion (requestUrl: string) {
  const cache = await caches.open(META_CACHE)
  await cache.delete(requestUrl)
}

/**
 * Build the stable cache name for a completed static precache.
 */
export function getStaticCacheName (version: string) {
  return STATIC_CACHE_PREFIX + version
}

/**
 * Build the temporary cache name used while installing a static precache.
 */
export function getInstallCacheName (version: string) {
  return INSTALL_CACHE_PREFIX + version
}

/**
 * Resolve a metadata version to an existing cache name, deleting stale metadata.
 */
async function getExistingMetaCacheName (requestUrl: string, cacheNames: string[]) {
  const version = await getMetaVersion(requestUrl)
  if (!version) return null

  const cacheName = getStaticCacheName(version)
  if (cacheNames.includes(cacheName)) return cacheName

  await deleteMetaVersion(requestUrl)
  return null
}
