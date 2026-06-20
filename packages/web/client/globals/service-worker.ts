/// <reference lib="webworker" />

import { handleActivate, handleFetch, handleInstall, handleMessage, shouldHandleRequest } from './service-worker/events.ts'
import { serviceWorker } from './service-worker/context.ts'

export {}

// Domstack discovers this reserved source filename and bundles everything it
// imports into the stable root /service-worker.js file that browsers update.
// Browser lifecycle overview:
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

// Installation is where the worker prepares the static offline cache. Using
// waitUntil makes installation fail if required cache work rejects.
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/install_event
serviceWorker.addEventListener('install', event => {
  event.waitUntil(handleInstall())
})

// Activation promotes a validated pending cache and removes stale cache state
// before this worker claims clients.
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/activate_event
serviceWorker.addEventListener('activate', event => {
  event.waitUntil(handleActivate())
})

// Fetch events let the worker replace default network handling for same-origin
// static requests while leaving API/admin/cross-origin traffic alone.
// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith
serviceWorker.addEventListener('fetch', event => {
  if (!shouldHandleRequest(event.request)) return
  event.respondWith(handleFetch(event.request))
})

// Message events are the control channel from the page runtime for update
// checks, skipWaiting, and applying a prepared cache.
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/message_event
serviceWorker.addEventListener('message', handleMessage)
