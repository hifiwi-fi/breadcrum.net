/**
 * @import {TemplateAsyncIterator} from '@domstack/static'
 */

import { stripIndent as js } from 'common-tags'

/** @type {TemplateAsyncIterator<{
 * siteName: string
 * siteDescription: string
 * }>} */
export default async function * serviceWorkerTemplate ({
  vars: {
    siteName,
    siteDescription
  }
}) {
  // First item
  yield {
    content: js`
      self.addEventListener('install', (event) => {
        console.log('Service worker installed')
      })
    `,
    outputName: 'service-worker.js'
  }

  // Second item
  const manifestData = {
    name: siteName,
    short_name: siteName,
    categories: ['productivity', 'utilities', 'social'],
    description: siteDescription,
    start_url: '/bookmarks',
    display: 'minimal-ui',
    screenshots: [
      {
        src: '/static/screenshots/bookmark-window-light.png',
        sizes: '1730×2724',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Bookmark listing showing bookmarks with episodes and archives'
      },
      {
        src: '/static/screenshots/feed-window-light.png',
        sizes: '1794×1728',
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
    outputName: 'manifest.json'
  }
}
