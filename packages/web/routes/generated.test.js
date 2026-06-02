import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../test/helper.js'

await suite('generated root routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('renders robots.txt from Fastify', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/robots.txt',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /text\/plain/)
    assert.match(res.payload, /User-agent: \*/)
    assert.match(res.payload, /Sitemap: http:\/\/localhost:3000\/sitemap\.xml/)
  })

  await test('renders opensearch.xml from Fastify', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/opensearch.xml',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /opensearchdescription\+xml/)
    assert.match(res.payload, /<ShortName>Breadcrum<\/ShortName>/)
    assert.match(res.payload, /template="http:\/\/localhost:3000\/search\/bookmarks\/\?query=\{searchTerms\}"/)
  })

  await test('renders giscus.json from Fastify', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/giscus.json',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /application\/json/)
    assert.deepStrictEqual(JSON.parse(res.payload), {
      origins: ['http://localhost:3000'],
      originsRegex: ['http://localhost:[0-9]+'],
    })
  })

  await test('renders manifest.webmanifest from Fastify', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/manifest.webmanifest',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /application\/manifest\+json/)
    const manifest = JSON.parse(res.payload)
    assert.strictEqual(manifest.name, 'Breadcrum')
    assert.strictEqual(manifest.start_url, '/bookmarks/')
    assert.strictEqual(manifest.share_target.action, '/bookmarks/add/')
  })

  await test('renders service-worker.js from Fastify', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/service-worker.js',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /javascript/)
    assert.match(res.payload, /Service worker installed/)
  })

  await test('renders JSON feed from content blog posts', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/feed.json',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /application\/feed\+json/)
    const feed = JSON.parse(res.payload)
    assert.strictEqual(feed.version, 'https://jsonfeed.org/version/1')
    assert.ok(Array.isArray(feed.items))
    assert.ok(feed.items.length > 0)
    assert.ok(feed.items.some((/** @type {{ url: string, content_html: string }} */ item) => {
      return item.url === 'http://localhost:3000/blog/2025/frontend-rewrite/' &&
        item.content_html.includes('/content/blog/2025/frontend-rewrite/img/lines.webp')
    }))
  })

  await test('renders XML feed from content blog posts', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/feed.xml',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /application\/atom\+xml/)
    assert.match(res.payload, /<feed/)
    assert.match(res.payload, /Frontend Rewrite/)
  })

  await test('renders sitemap.xml from Fastify route inventory', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/sitemap.xml',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /application\/xml/)
    assert.match(res.payload, /http:\/\/localhost:3000\/docs\/tutorial\//)
    assert.match(res.payload, /http:\/\/localhost:3000\/docs\/bookmarks\/bookmarklets\//)
    assert.match(res.payload, /http:\/\/localhost:3000\/blog\/2025\/frontend-rewrite\//)
    assert.doesNotMatch(res.payload, /the-insert-monopoly-here-problem/)
    assert.doesNotMatch(res.payload, /http:\/\/localhost:3000\/docs\/bookmarklets\//)
  })
})
