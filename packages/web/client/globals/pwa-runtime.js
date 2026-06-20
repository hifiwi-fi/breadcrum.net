/// <reference lib="dom" />

/**
 * @typedef {object} PwaUpdateDetail
 * @property {'worker'|'cache'} kind
 * @property {string} [version]
 */

/**
 * @typedef {object} ResetOptions
 * @property {boolean} reload
 */

/**
 * @typedef {object} UpdateCheckOptions
 * @property {boolean} [force]
 */

/**
 * @typedef {object} ClearUpdateNoticeOptions
 * @property {'worker'|'cache'} [unlessKind]
 */

import { DOMSTACK_OUTPUT_MANIFEST_ENABLED, DOMSTACK_SERVICE_WORKER_URL } from './pwa-cache-policy.js'

const CACHE_PREFIX = 'breadcrum-'
const PWA_DEV_OPT_IN_KEY = 'breadcrum:pwa-dev'
const SERVICE_WORKER_URL = DOMSTACK_SERVICE_WORKER_URL
const SERVICE_WORKER_SCOPE = process.env['DOMSTACK_SERVICE_WORKER_SCOPE'] ?? '/'
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000

/** @type {ServiceWorkerRegistration | null} */
let latestRegistration = null
let updateDismissed = false
/** @type {'worker'|'cache'|null} */
let updateNoticeKind = null
let reloadPending = false
let reloadOnControllerChange = false
let formIsDirty = false
let lastUpdateCheck = 0

/**
 * Register the service worker and wire the browser-side PWA lifecycle.
 */
export async function initializePwa () {
  if (!('serviceWorker' in navigator)) return

  setupDirtyFormTracking()
  setupUpdateActions()

  if (new URLSearchParams(window.location.search).has('reset-sw')) {
    await resetPwaState({ reload: true })
    return
  }

  // Domstack intentionally disables the output manifest in watch mode. Without
  // that manifest, Breadcrum cannot validate a static offline cache, so clear
  // any previous PWA state and leave the page on normal network behavior.
  if (!DOMSTACK_OUTPUT_MANIFEST_ENABLED || !SERVICE_WORKER_URL || !SERVICE_WORKER_SCOPE) {
    await resetPwaState({ reload: false })
    return
  }

  if (isLocalDevOrigin() && !isPwaDevEnabled()) {
    await resetPwaState({ reload: false })
    return
  }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: SERVICE_WORKER_SCOPE,
      updateViaCache: 'none',
    })

    latestRegistration = registration
    observeRegistration(registration)
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    await checkForUpdates(registration)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(registration).catch(err => {
          console.error('Service Worker update check failed:', err)
        })
      }
    })

    window.addEventListener('online', () => {
      checkForUpdates(registration, { force: true }).catch(err => {
        console.error('Service Worker update check failed:', err)
      })
    })
  } catch (err) {
    console.error('Service Worker registration failed:', err)
  }
}

/**
 * Observe browser service worker update states and surface waiting workers to the UI.
 *
 * @param {ServiceWorkerRegistration} registration
 */
function observeRegistration (registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    notifyUpdateAvailable({ kind: 'worker' })
  }

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing
    if (!installingWorker) return

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        notifyUpdateAvailable({ kind: 'worker' })
      }
    })
  })
}

/**
 * Ask the browser and active worker to look for worker or static cache updates.
 *
 * @param {ServiceWorkerRegistration} registration
 * @param {UpdateCheckOptions} [options]
 */
async function checkForUpdates (registration, options = {}) {
  const now = Date.now()
  if (!options.force && now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) return

  try {
    await registration.update()
    lastUpdateCheck = Date.now()

    if (registration.waiting && navigator.serviceWorker.controller) {
      notifyUpdateAvailable({ kind: 'worker' })
      return
    }

    if (registration.installing) return

    navigator.serviceWorker.controller?.postMessage({ type: 'CHECK_FOR_UPDATES' })
  } catch (err) {
    lastUpdateCheck = 0
    console.error('Service Worker update check failed:', err)
  }
}

/**
 * Handle cache lifecycle messages posted by the service worker.
 *
 * @param {MessageEvent} event
 */
function handleServiceWorkerMessage (event) {
  const message = event.data || {}

  if (message.type === 'CACHE_UPDATE_READY') {
    notifyUpdateAvailable({
      kind: 'cache',
      version: typeof message.version === 'string' ? message.version : undefined,
    })
    return
  }

  if (message.type === 'CACHE_UPDATE_CURRENT') {
    clearUpdateNotice({ unlessKind: 'worker' })
    return
  }

  if (message.type === 'CACHE_UPDATE_APPLIED') {
    reloadForUpdate()
    return
  }

  if (message.type === 'CACHE_UPDATE_FAILED') {
    lastUpdateCheck = 0
    console.error('Service Worker cache update failed:', message.message)
  }
}

/**
 * Listen for update actions from the header notice and low-risk page lifecycle moments.
 */
function setupUpdateActions () {
  window.addEventListener('breadcrum:pwa-apply-update', () => {
    applyUpdate().catch(err => {
      console.error('Service Worker update apply failed:', err)
    })
  })

  window.addEventListener('breadcrum:pwa-dismiss-update', () => {
    updateDismissed = true
    clearUpdateNotice()
  })

  window.addEventListener('pagehide', () => {
    if (!formIsDirty) {
      applyUpdate().catch(err => {
        console.error('Service Worker update apply failed:', err)
      })
    }
  })
}

/**
 * Apply a waiting worker update or promote a prepared pending static cache.
 */
async function applyUpdate () {
  const registration = latestRegistration ?? await navigator.serviceWorker.ready

  if (registration.waiting) {
    reloadOnControllerChange = true
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    return
  }

  navigator.serviceWorker.controller?.postMessage({ type: 'APPLY_PENDING_CACHE' })
}

/**
 * Reload after the browser switches this page to a newly activated worker.
 */
function handleControllerChange () {
  if (!reloadOnControllerChange) return
  reloadForUpdate()
}

/**
 * Reload once for an accepted PWA update.
 */
function reloadForUpdate () {
  if (reloadPending) return
  reloadPending = true
  window.location.reload()
}

/**
 * Show the header update notice unless the user dismissed updates this session.
 *
 * @param {PwaUpdateDetail} detail
 */
function notifyUpdateAvailable (detail) {
  if (updateDismissed) return

  updateNoticeKind = detail.kind
  window.dispatchEvent(new CustomEvent('breadcrum:pwa-update-available', {
    detail,
  }))
}

/**
 * Clear the header update notice, optionally preserving a higher-priority notice.
 *
 * @param {ClearUpdateNoticeOptions} [options]
 */
function clearUpdateNotice (options = {}) {
  if (options.unlessKind && updateNoticeKind === options.unlessKind) return

  updateNoticeKind = null
  window.dispatchEvent(new CustomEvent('breadcrum:pwa-update-cleared'))
}

/**
 * Unregister Breadcrum service workers and delete Breadcrum-owned caches.
 *
 * @param {ResetOptions} options
 */
async function resetPwaState ({ reload }) {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations
      .filter(registration => new URL(registration.scope).origin === window.location.origin)
      .map(registration => registration.unregister()))

    const cacheNames = await caches.keys()
    await Promise.all(cacheNames
      .filter(cacheName => cacheName.startsWith(CACHE_PREFIX))
      .map(cacheName => caches.delete(cacheName)))
  } catch (err) {
    console.error('Service Worker reset failed:', err)
  }

  if (reload) {
    const url = new URL(window.location.href)
    url.searchParams.delete('reset-sw')
    window.location.replace(url.toString())
  }
}

/**
 * Track whether form edits make automatic update application risky.
 */
function setupDirtyFormTracking () {
  document.addEventListener('input', markFormDirty, true)
  document.addEventListener('change', markFormDirty, true)
  document.addEventListener('submit', () => {
    formIsDirty = false
  }, true)
}

/**
 * Mark the page dirty when a form field changes.
 *
 * @param {Event} event
 */
function markFormDirty (event) {
  if (event.target instanceof HTMLElement && event.target.closest('form')) {
    formIsDirty = true
  }
}

/**
 * Read the local development opt-in flag for service worker behavior.
 */
function isPwaDevEnabled () {
  try {
    return window.localStorage.getItem(PWA_DEV_OPT_IN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Detect local development origins where PWA caching should be disabled by default.
 */
function isLocalDevOrigin () {
  return window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.endsWith('.localhost')
}
