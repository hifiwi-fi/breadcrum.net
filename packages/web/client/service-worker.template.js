/**
 * @import {TemplateAsyncIterator} from '@domstack/static'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

import { stripIndent as js } from 'common-tags'

/** @type {TemplateAsyncIterator<GlobalVars>} */
export default async function * serviceWorkerTemplate ({
  vars: {
    siteName,
    siteDescription,
    themeColorLight,
    backgroundColor
  }
}) {
  // First item
  yield {
    content: js`
      const CACHE_VERSION = 'v1'
      const CACHE_NAME = \`breadcrum-app-shell-\${CACHE_VERSION}\`
      const CACHE_PREFIX = 'breadcrum-app-shell-'
      const NAVIGATION_FALLBACK_URL = '/bookmarks'
      const APP_SHELL_URLS = [
        '/',
        '/bookmarks',
        '/archives',
        '/episodes',
        '/feeds',
        '/tags',
        '/search',
        '/manifest.webmanifest',
        '/static/breadcrum-192.png',
        '/static/breadcrum-512.png',
      ]

      function isApiRequest (url) {
        return url.pathname === '/api' || url.pathname.startsWith('/api/')
      }

      function isStaticAssetRequest (url) {
        return url.pathname.startsWith('/static/') ||
          url.pathname.startsWith('/globals/') ||
          url.pathname.startsWith('/layouts/') ||
          /\\.(?:css|js|png|jpe?g|webp|svg|ico|webmanifest|xml|json)$/.test(url.pathname)
      }

      async function cacheResponse (cache, request, response) {
        if (response.ok && response.type === 'basic' && !response.redirected) {
          await cache.put(request, response.clone())
        }
      }

      async function preCacheAppShell () {
        const cache = await caches.open(CACHE_NAME)
        await Promise.all(APP_SHELL_URLS.map(async url => {
          try {
            const response = await fetch(url, { credentials: 'same-origin' })
            await cacheResponse(cache, url, response)
          } catch (err) {
            console.warn('Service worker pre-cache failed:', url, err)
          }
        }))
      }

      async function fetchAndCache (request, cache) {
        const response = await fetch(request)
        await cacheResponse(cache, request, response)
        return response
      }

      async function handleNavigationRequest (request) {
        const cache = await caches.open(CACHE_NAME)

        try {
          return await fetchAndCache(request, cache)
        } catch {
          return await cache.match(request) ||
            await cache.match(NAVIGATION_FALLBACK_URL) ||
            await cache.match('/') ||
            new Response('Offline', {
              status: 503,
              headers: { 'content-type': 'text/plain' },
            })
        }
      }

      async function handleStaticAssetRequest (event) {
        const request = event.request
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = await cache.match(request)

        if (cachedResponse) {
          event.waitUntil(fetchAndCache(request, cache).catch(() => undefined))
          return cachedResponse
        }

        return fetchAndCache(request, cache)
      }

      self.addEventListener('install', event => {
        event.waitUntil((async () => {
          await preCacheAppShell()
          await self.skipWaiting()
        })())
      })

      self.addEventListener('activate', event => {
        event.waitUntil((async () => {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(cacheName => {
            if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
            return undefined
          }))
          await self.clients.claim()
        })())
      })

      self.addEventListener('fetch', event => {
        const request = event.request
        const url = new URL(request.url)

        if (request.method !== 'GET' || url.origin !== self.location.origin || isApiRequest(url)) {
          return
        }

        if (request.mode === 'navigate') {
          event.respondWith(handleNavigationRequest(request))
          return
        }

        if (isStaticAssetRequest(url)) {
          event.respondWith(handleStaticAssetRequest(event))
        }
      })
    `,
    outputName: 'service-worker.js'
  }

  // Second item
  const manifestData = {
    id: '/bookmarks',
    name: siteName,
    short_name: siteName,
    lang: 'en',
    dir: 'ltr',
    categories: ['productivity', 'utilities', 'social'],
    description: siteDescription,
    start_url: '/bookmarks',
    display: 'minimal-ui',
    theme_color: themeColorLight,
    background_color: backgroundColor,
    screenshots: [
      {
        src: '/static/screenshots/bookmark-window-light.png',
        sizes: '1730x2724',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Bookmark listing showing bookmarks with episodes and archives'
      },
      {
        src: '/static/screenshots/feed-window-light.png',
        sizes: '1794x1728',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Feed listing showing episodes sent to a podcast app'
      }
    ],
    icons: [
      {
        src: '/static/breadcrum-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/static/breadcrum-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/static/apple-icons/apple-icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    share_target: {
      action: '/bookmarks/add',
      method: 'GET',
      params: {
        title: 'title',
        // Note that android sends the URL as 'text' instead of 'url'
        // but other apps send the url as 'url`
        // so you need to handle that PWA client side.
        text: 'summary',
        url: 'url'
      }
    }
  }

  yield {
    content: JSON.stringify(manifestData, null, 2),
    outputName: 'manifest.webmanifest'
  }
}
