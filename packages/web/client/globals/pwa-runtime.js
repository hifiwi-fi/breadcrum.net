/// <reference lib="dom" />

import {
  cachePrefixes,
  pwaDevOptInKey,
  serviceWorkerScope,
  serviceWorkerUrl,
} from './service-worker/service-worker-settings.ts'

const manifestEnabled = process.env['DOMSTACK_MANIFEST_ENABLED'] === 'true'
const updateCheckInterval = 5 * 60 * 1000

/** @type {ServiceWorkerRegistration | null} */
let latestRegistration = null
let updateDismissed = false
let reloadPending = false
let reloadOnControllerChange = false
let formIsDirty = false
let lastUpdateCheck = 0

/** Register the service worker and wire the browser-side PWA lifecycle. */
export async function initializePwa () {
  if (!('serviceWorker' in navigator)) return

  setupDirtyFormTracking()
  setupUpdateActions()

  if (new URLSearchParams(window.location.search).has('reset-sw')) {
    await resetPwaState({ reload: true })
    return
  }

  if (!manifestEnabled || !serviceWorkerUrl || !serviceWorkerScope) {
    await resetPwaState({ reload: false })
    return
  }

  if (isLocalDevOrigin() && !isPwaDevEnabled()) {
    await resetPwaState({ reload: false })
    return
  }

  try {
    const registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
      scope: serviceWorkerScope,
      updateViaCache: 'none',
    })

    latestRegistration = registration
    observeRegistration(registration)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    await checkForUpdates(registration)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(registration).catch(err => {
          console.error('Service worker update check failed:', err)
        })
      }
    })

    window.addEventListener('online', () => {
      checkForUpdates(registration, { force: true }).catch(err => {
        console.error('Service worker update check failed:', err)
      })
    })
  } catch (err) {
    console.error('Service worker registration failed:', err)
  }
}

/**
 * Observe browser service worker update states and surface waiting workers to the UI.
 *
 * @param {ServiceWorkerRegistration} registration
 */
function observeRegistration (registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    notifyUpdateAvailable()
  }

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing
    if (!installingWorker) return

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        notifyUpdateAvailable()
      }
    })
  })
}

/**
 * Ask the browser to look for an updated service worker bundle.
 *
 * @param {ServiceWorkerRegistration} registration
 * @param {{ force?: boolean }} [options]
 */
async function checkForUpdates (registration, options = {}) {
  const now = Date.now()
  if (!options.force && now - lastUpdateCheck < updateCheckInterval) return

  try {
    await registration.update()
    lastUpdateCheck = Date.now()

    if (registration.waiting && navigator.serviceWorker.controller) {
      notifyUpdateAvailable()
    }
  } catch (err) {
    lastUpdateCheck = 0
    console.error('Service worker update check failed:', err)
  }
}

/** Listen for update actions from the header notice and low-risk page lifecycle moments. */
function setupUpdateActions () {
  window.addEventListener('breadcrum:pwa-apply-update', () => {
    applyUpdate().catch(err => {
      console.error('Service worker update apply failed:', err)
    })
  })

  window.addEventListener('breadcrum:pwa-dismiss-update', () => {
    updateDismissed = true
    clearUpdateNotice()
  })

  window.addEventListener('pagehide', () => {
    if (!formIsDirty) {
      applyUpdate().catch(err => {
        console.error('Service worker update apply failed:', err)
      })
    }
  })
}

/** Apply a waiting worker update. */
async function applyUpdate () {
  const registration = latestRegistration ?? await navigator.serviceWorker.ready
  if (!registration.waiting) return

  reloadOnControllerChange = true
  registration.waiting.postMessage({ type: 'SKIP_WAITING' })
}

/** Reload after the browser switches this page to a newly activated worker. */
function handleControllerChange () {
  if (!reloadOnControllerChange) return
  reloadForUpdate()
}

/** Reload once for an accepted PWA update. */
function reloadForUpdate () {
  if (reloadPending) return
  reloadPending = true
  window.location.reload()
}

/** Show the header update notice unless the user dismissed updates this session. */
function notifyUpdateAvailable () {
  if (updateDismissed) return

  window.dispatchEvent(new CustomEvent('breadcrum:pwa-update-available', {
    detail: { kind: 'worker' },
  }))
}

/** Clear the header update notice. */
function clearUpdateNotice () {
  window.dispatchEvent(new CustomEvent('breadcrum:pwa-update-cleared'))
}

/**
 * Unregister Breadcrum service workers and delete Breadcrum-owned caches.
 *
 * @param {{ reload: boolean }} options
 */
async function resetPwaState ({ reload }) {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations
      .filter(registration => new URL(registration.scope).origin === window.location.origin)
      .map(registration => registration.unregister()))

    const cacheNames = await caches.keys()
    await Promise.all(cacheNames
      .filter(cacheName => cachePrefixes.some(cachePrefix => cacheName.startsWith(cachePrefix)))
      .map(cacheName => caches.delete(cacheName)))
  } catch (err) {
    console.error('Service worker reset failed:', err)
  }

  if (reload) {
    const url = new URL(window.location.href)
    url.searchParams.delete('reset-sw')
    window.location.replace(url.toString())
  }
}

/** Track whether form edits make automatic update application risky. */
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

/** Read the local development opt-in flag for service worker behavior. */
function isPwaDevEnabled () {
  try {
    return window.localStorage.getItem(pwaDevOptInKey) === '1'
  } catch {
    return false
  }
}

/** Detect local development origins where PWA caching should be disabled by default. */
function isLocalDevOrigin () {
  return window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.endsWith('.localhost')
}
