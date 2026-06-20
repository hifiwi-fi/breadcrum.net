/// <reference lib="webworker" />

import { DOMSTACK_MANIFEST_URL, DOMSTACK_OUTPUT_MANIFEST_ENABLED } from '../pwa-cache-policy.js'
import { OFFLINE_URL } from './constants.ts'
import { getActiveCacheName } from './cache.ts'
import { serviceWorker } from './context.ts'

/**
 * Serve same-origin static requests from the active cache with network fallback.
 */
export async function handleFetch (request: Request) {
  const activeCacheName = await getActiveCacheName()
  if (!activeCacheName) return fetch(request)

  const cache = await caches.open(activeCacheName)

  if (isNavigationRequest(request)) {
    const cached = await matchNavigation(cache, request)
    if (cached) return cached

    try {
      return await fetch(request)
    } catch {
      return await getOfflineFallback(cache)
    }
  }

  const cached = await cache.match(request)
  if (cached) return cached

  return fetch(request)
}

/**
 * Decide whether the service worker should intercept a request.
 */
export function shouldHandleRequest (request: Request) {
  if (!DOMSTACK_OUTPUT_MANIFEST_ENABLED) return false
  if (request.method !== 'GET') return false

  const url = new URL(request.url)
  if (url.origin !== serviceWorker.location.origin) return false

  if (url.pathname === DOMSTACK_MANIFEST_URL) return false
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') return false
  if (url.pathname.startsWith('/admin/') || url.pathname === '/admin') return false

  return true
}

/**
 * Detect document navigations that should receive cached HTML or the offline fallback.
 */
function isNavigationRequest (request: Request) {
  return request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html')
}

/**
 * Match a navigation request against cached clean URLs and generated index files.
 */
async function matchNavigation (cache: Cache, request: Request) {
  const cached = await cache.match(request, { ignoreSearch: true })
  if (cached) return cached

  const url = new URL(request.url)
  const candidates = []

  if (!url.pathname.endsWith('/')) {
    candidates.push(url.origin + url.pathname + '/')
  }

  if (url.pathname.endsWith('/')) {
    candidates.push(url.origin + url.pathname + 'index.html')
  }

  for (const candidate of candidates) {
    const candidateResponse = await cache.match(candidate, { ignoreSearch: true })
    if (candidateResponse) return candidateResponse
  }

  return null
}

/**
 * Return the cached offline page or a minimal inline offline response.
 */
async function getOfflineFallback (cache: Cache) {
  const cachedOfflinePage = await cache.match(new URL(OFFLINE_URL, serviceWorker.location.origin))
  if (cachedOfflinePage) return cachedOfflinePage

  return new Response('<!doctype html><title>Offline</title><h1>Offline</h1><p>This page is not available offline.</p>', {
    status: 503,
    statusText: 'Offline',
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}
