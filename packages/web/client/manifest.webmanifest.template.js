/**
 * @import {TemplateFunction} from '@domstack/static'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/** @type {TemplateFunction<GlobalVars>} */
export default async function manifestWebmanifestTemplate ({
  vars: {
    siteName,
    siteDescription,
    themeColorLight,
    backgroundColor
  }
}) {
  return JSON.stringify({
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
        // Android sends the URL as text; other apps may send it as url.
        text: 'summary',
        url: 'url'
      }
    }
  }, null, 2)
}
