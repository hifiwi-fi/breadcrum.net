import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../test/helper.js'
import '../scripts/build-assets.js'

await suite('HTML content routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('renders about markdown through Fastify', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/about/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /text\/html/)
    assert.match(res.payload, /<article class="bc-content-page bc-content-page-about">/)
    assert.match(res.payload, /Breadcrum\.net is a bookmarking service/)
    assert.doesNotMatch(res.payload, /\{\{ vars\./)
  })

  await test('renders docs markdown and htmx main fragments', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/docs/',
      headers: {
        'hx-request': 'true',
        'hx-target': 'bc-main',
      },
    })

    assert.strictEqual(res.statusCode, 200)
    assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
    assert.match(res.payload, /<h1 class="p-name bc-article-title" itemprop="headline">📚 Docs<\/h1>/)
    assert.match(res.payload, /href="\.\/bookmarks\/"/)
  })

  await test('renders the special bookmarklet docs page without Preact', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/docs/bookmarks/bookmarklets/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /data-bc-copy-text="javascript:/)
    assert.match(res.payload, /Version 1\.0\.13/)
    assert.doesNotMatch(res.payload, /preact/)
  })

  await test('renders the special tutorial docs page with content image URLs', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/docs/tutorial/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /Welcome to 🥖 Breadcrum/)
    assert.match(res.payload, /\/content\/docs\/tutorial\/img\/add-bookmark\.png/)
  })

  await test('renders legal markdown with server-side variables', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/legal/privacy/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /Privacy Policy/)
    assert.match(res.payload, /support@breadcrum\.net/)
    assert.match(res.payload, /Ahrefs/)
    assert.match(res.payload, /Backblaze B2/)
    assert.doesNotMatch(res.payload, /\{\{/)
  })

  await test('renders blog index and year index', async (t) => {
    const app = await build(t)
    const indexRes = await app.inject({
      url: '/blog/',
    })
    const yearRes = await app.inject({
      url: '/blog/2025/',
    })

    assert.strictEqual(indexRes.statusCode, 200)
    assert.match(indexRes.payload, /Breadcrum\.net Blog/)
    assert.match(indexRes.payload, /href="\/blog\/2025\/frontend-rewrite\/"/)
    assert.match(indexRes.payload, /<meta name="robots" content="noindex,nofollow">/)

    assert.strictEqual(yearRes.statusCode, 200)
    assert.match(yearRes.payload, /All 2025 Blog Posts/)
    assert.match(yearRes.payload, /Frontend Rewrite/)
  })

  await test('renders blog article markdown and rewrites relative images', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/blog/2025/frontend-rewrite/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /Frontend Rewrite/)
    assert.match(res.payload, /\/content\/blog\/2025\/frontend-rewrite\/img\/lines\.webp/)
    assert.match(res.payload, /<meta property="og:image" content="http:\/\/localhost:3000\/content\/blog\/2025\/frontend-rewrite\/img\/preact\.webp">/)
  })

  await test('does not render draft blog posts', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/blog/2025/the-insert-monopoly-here-problem/',
    })

    assert.strictEqual(res.statusCode, 404)
    assert.match(res.payload, /Blog post not found/)
  })

  await test('serves copied content images from public content path', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/content/blog/2025/frontend-rewrite/img/lines.webp',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /image\/webp/)
  })
})
