/// <reference lib="dom" />

// Network-only is intentional: no fetch interception, precaching, or offline fallback.
// Keep runtime imports/exports out so the existing classic worker registration still works.
self.addEventListener('install', () => {
  console.log('Service worker installed')
})
