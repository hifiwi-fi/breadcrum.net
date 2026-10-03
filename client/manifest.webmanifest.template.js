/**
 * @import { AsyncTemplateFunction } from '@domstack/static/types.js'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/** @type {AsyncTemplateFunction<GlobalVars>} */
export default async function webmanifestTemplate ({
  vars: {
    siteName,
    siteDescription,
    themeColorLight,
    backgroundColor
  }
}) {
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

  return JSON.stringify(manifestData, null, 2)
}
