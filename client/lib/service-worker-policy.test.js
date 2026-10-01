import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { Script } from 'node:vm'
import { DOMSTACK_MANIFEST_SCHEMA_ID, reconcileDomstackManifest } from '@domstack/static'
import settings from '../domstack-manifest.settings.js'
import { createServiceWorkerPolicy, isPublicServiceWorkerAsset } from './service-worker-policy.js'

/**
 * @import { DomstackManifest, DomstackManifestEntry } from '@domstack/static/types.js'
 * @import { ServiceWorkerPolicy } from './service-worker-policy.js'
 */

/** @type {DomstackManifestEntry} */
const publicAsset = {
  outputRelname: 'static/breadcrum-192.png',
  url: '/static/breadcrum-192.png',
  kind: 'static',
  static: true,
  role: 'subresource',
  contentType: 'image/png',
  revision: 'a'.repeat(64),
  bytes: 100,
}

/**
 * @param {DomstackManifestEntry[]} entries
 * @returns {DomstackManifest}
 */
function manifestWith (entries) {
  return {
    $schema: DOMSTACK_MANIFEST_SCHEMA_ID,
    version: 'test-version',
    generatedAt: '2026-01-01T00:00:00.000Z',
    entries,
  }
}

/** @param {string} outputRelname */
function assetAt (outputRelname) {
  return { ...publicAsset, outputRelname, url: `/${outputRelname}` }
}

test('public asset inventory permits only copied images and fonts in public locations', () => {
  assert.equal(isPublicServiceWorkerAsset(publicAsset), true)
  assert.equal(isPublicServiceWorkerAsset({ ...publicAsset, contentType: publicAsset.outputRelname }), true)
  assert.equal(isPublicServiceWorkerAsset({ ...assetAt('favicon.ico'), kind: 'copy', contentType: 'image/x-icon' }), true)
  assert.equal(isPublicServiceWorkerAsset(assetAt('static/screenshots/bookmark-window-light.png')), true)
  assert.equal(isPublicServiceWorkerAsset({ ...assetAt('static/fonts/body.woff2'), contentType: 'font/woff2' }), true)

  for (const route of ['account', 'admin', 'api', 'archives', 'bookmarks', 'episodes', 'feeds', 'search', 'tags', 'login', 'logout', 'register', 'password_reset', 'email_confirm', 'unsubscribe']) {
    assert.equal(isPublicServiceWorkerAsset(assetAt(`${route}/private.png`)), false, route)
    assert.equal(isPublicServiceWorkerAsset({ ...assetAt(`${route}/index.html`), kind: 'page', contentType: 'text/html' }), false, route)
  }

  for (const path of ['index.html', 'about/index.html', 'feed.json', 'feed.xml', 'manifest.webmanifest', 'domstack-manifest.json', 'service-worker.js', 'static/document.html', 'static/feed.json', 'static/feed.xml', 'static/client.js', 'static/client.js.map', 'static/../admin/private.png', 'static/%2e%2e/private.png']) {
    assert.equal(isPublicServiceWorkerAsset(assetAt(path)), false, path)
  }
})

test('asset policy rejects page ownership, metadata, nonstatic output, and URL aliases', () => {
  /** @type {Array<Partial<DomstackManifestEntry>>} */
  const excluded = [
    { static: false },
    { revision: null },
    { role: 'navigation' },
    { role: 'metadata' },
    { kind: 'page' },
    { kind: 'page-output' },
    { kind: 'template' },
    { kind: 'metadata' },
    { kind: 'script' },
    { kind: 'style' },
    { kind: 'chunk' },
    { kind: 'worker' },
    { kind: 'worker-manifest' },
    { kind: 'service-worker' },
    { kind: 'sourcemap' },
    { page: { path: 'bookmarks', url: '/bookmarks/' } },
    { pagePath: 'bookmarks' },
    { pageUrl: '/bookmarks/' },
    { templatePath: 'feeds.template.js' },
    { manifestVars: { title: 'Private bookmark' } },
    { contentType: 'text/html; charset=utf-8' },
    { contentType: 'application/json' },
    { url: '/api/private.png' },
    { url: 'https://example.com/static/breadcrum-192.png' },
    { url: '/static/breadcrum-192.png?token=secret' },
    { outputRelname: 'admin/private.png' },
  ]
  for (const override of excluded) {
    assert.equal(isPublicServiceWorkerAsset({ ...publicAsset, ...override }), false, JSON.stringify(override))
  }
})

test('reconciled metadata and injected worker policy contain no private entries or document variables', async () => {
  const privateEntry = {
    ...assetAt('bookmarks/index.html'),
    kind: /** @type {const} */ ('page'),
    page: { path: 'bookmarks', url: '/bookmarks/' },
    manifestVars: { title: 'Private bookmark', token: 'secret' },
  }
  const { manifest } = await reconcileDomstackManifest({
    dest: import.meta.dirname,
    entries: [publicAsset, privateEntry, assetAt('feeds/private.png'), assetAt('api/private.png')],
    options: settings,
  })
  assert.deepEqual(manifest.entries.map(entry => entry.url), [publicAsset.url])
  assert.deepEqual(manifest.policy, { mode: 'network-only' })
  assert.deepEqual(settings.manifestVars, [])
  assert.equal(JSON.stringify(manifest).includes('Private bookmark'), false)

  const policy = createServiceWorkerPolicy(manifest)
  assert.deepEqual(policy, {
    mode: 'network-only',
    version: manifest.version,
    publicAssets: [{ url: publicAsset.url, revision: publicAsset.revision }],
  })
  // The hook projection independently filters entries rather than trusting callers.
  assert.deepEqual(createServiceWorkerPolicy(manifestWith([publicAsset, privateEntry])).publicAssets, policy.publicAssets)

  const { manifest: changedPrivateManifest } = await reconcileDomstackManifest({
    dest: import.meta.dirname,
    entries: [publicAsset, { ...privateEntry, revision: 'b'.repeat(64) }],
    options: settings,
  })
  assert.equal(changedPrivateManifest.version, manifest.version)

  /** @type {Map<string, unknown>} */
  const injected = new Map()
  for (const hook of settings.hooks.manifestBuilt) {
    await hook({
      dest: import.meta.dirname,
      manifest,
      defineServiceWorkerConstant: (name, value) => { injected.set(name, value) },
      writeFile: async () => { assert.fail('No public manifest or route inventory should be written') },
    })
  }
  assert.deepEqual([...injected], [['globalThis.BREADCRUM_SERVICE_WORKER_POLICY', policy]])
})

/**
 * @param {ServiceWorkerPolicy | undefined} injectedPolicy
 */
async function runWorker (injectedPolicy) {
  const source = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8')
  /** @type {Map<string, () => void>} */
  const listeners = new Map()
  /** @type {unknown[][]} */
  const logs = []
  const script = new Script(source, { filename: 'service-worker.js' })
  script.runInNewContext({
    BREADCRUM_SERVICE_WORKER_POLICY: injectedPolicy,
    self: {
      /** @param {string} type @param {() => void} handler */
      addEventListener: (type, handler) => { listeners.set(type, handler) },
    },
    console: {
      /** @param {unknown[]} args */
      log: (...args) => { logs.push(args) },
    },
    fetch: () => { assert.fail('Service worker must not fetch or precache') },
    get caches () { return assert.fail('Service worker must not access CacheStorage') },
  })
  assert.deepEqual([...listeners.keys()], ['install'])
  const install = listeners.get('install')
  assert.ok(install)
  install()
  assert.equal(logs.length, 1)
  const [message, policy] = /** @type {[string, ServiceWorkerPolicy]} */ (logs[0])
  assert.equal(message, 'Service worker installed')
  assert.equal(Object.isFrozen(policy), true)
  assert.equal(Object.isFrozen(policy.publicAssets), true)
  for (const asset of policy.publicAssets) assert.equal(Object.isFrozen(asset), true)
  // Normalize the VM realm's objects for strict structural comparison.
  return /** @type {ServiceWorkerPolicy} */ (JSON.parse(JSON.stringify(policy)))
}

test('classic worker stays network-only with finalized policy', async () => {
  const policy = createServiceWorkerPolicy(manifestWith([publicAsset]))
  assert.deepEqual(await runWorker(policy), policy)
})

test('worker remains network-only without manifest injection in watch mode', async () => {
  assert.deepEqual(await runWorker(undefined), { mode: 'network-only', version: null, publicAssets: [] })
})
