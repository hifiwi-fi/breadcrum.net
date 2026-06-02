/** @import { GlobalVars } from './globals/global.vars.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import serviceWorkerTemplate from './service-worker.template.js'

/** @type {GlobalVars} */
const vars = {
  siteName: 'Breadcrum',
  siteDescription: 'Personal private bookmarking.',
  siteTwitter: '@breadcrum_',
  siteTwitterUrl: 'https://example.com',
  supportEmail: 'support@example.com',
  jurisdiction: 'California, USA',
  mastodonUrl: 'https://example.com/@breadcrum',
  bskyUrl: 'https://bsky.app/profile/example.com',
  discordUrl: 'https://discord.gg/example',
  version: '0.0.0',
  authorName: 'Breadcrum',
  authorUrl: 'https://example.com',
  authorImgUrl: 'https://example.com/static/breadcrum-fill-red.png',
  authorImgAlt: 'Breadcrum',
  transport: 'https',
  host: 'example.com',
  baseUrl: 'https://example.com',
  themeColorLight: '#ffffff',
  themeColorDark: '#1a1a1a',
  backgroundColor: '#ffffff',
  providers: {
    hostingProvider: 'Fly.io',
    storageProvider: 'Backblaze B2',
    emailProvider: 'AWS SES',
  },
}

suite('service worker template', () => {
  test('generates app-shell cache handlers and bypasses API requests', async () => {
    /** @type {{ outputName: string, content: string }[]} */
    const outputs = []
    const template = {
      templateFile: {
        root: '',
        filepath: 'service-worker.template.js',
        relname: 'service-worker.template.js',
        basename: 'service-worker.template.js',
        parentName: '',
      },
      path: '',
      outputName: 'service-worker.js',
    }

    for await (const output of serviceWorkerTemplate({ vars, template, pages: [] })) {
      outputs.push(output)
    }

    const serviceWorkerOutput = outputs.find(output => output.outputName === 'service-worker.js')
    if (!serviceWorkerOutput) throw new Error('service-worker.js output is required')

    const content = /** @type {string} */ (serviceWorkerOutput.content)

    assert.ok(content.includes("self.addEventListener('install'"))
    assert.ok(content.includes("self.addEventListener('activate'"))
    assert.ok(content.includes("self.addEventListener('fetch'"))
    assert.ok(content.includes('caches.open(CACHE_NAME)'))
    assert.ok(content.includes('caches.delete(cacheName)'))
    assert.ok(content.includes("url.pathname === '/api' || url.pathname.startsWith('/api/')"))
    assert.ok(content.includes("request.mode === 'navigate'"))
    assert.ok(content.includes("NAVIGATION_FALLBACK_URL = '/bookmarks'"))
    assert.ok(content.includes("'/manifest.webmanifest'"))
  })
})
