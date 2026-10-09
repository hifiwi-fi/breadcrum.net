import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { testBuild } from '@domstack/static'
import { JSDOM } from 'jsdom'

/** @import { TestContext } from 'node:test' */
/** @import { Results } from '@domstack/static/lib/builder.js' */

/**
 * @typedef {{ title: string, url: string, date_published: string, content_html: string }} FeedItem
 * @typedef {{ title: string, home_page_url: string, items: FeedItem[] }} Feed
 */

const origin = 'https://build.example.test'

/** @param {Results} results */
function assertSuccessful (results) {
  assert.deepEqual(results.siteData.errors, [])

  assert.ok(results.pageBuildResults, 'page build report exists')
  assert.deepEqual(results.pageBuildResults.errors, [])
  assert.deepEqual(results.staticResults?.errors ?? [], [])
  assert.deepEqual(results.copyResults?.errors ?? [], [])
  assert.ok(results.pageBuildResults.outputs.length > 0)
}

/** @param {string} html */
function assertRootOnce (html) {
  assert.equal(html.match(/<!doctype html>/gi)?.length, 1)
  assert.equal(html.match(/<html\b/gi)?.length, 1)
  assert.equal(html.match(/<head>/g)?.length, 1)
  assert.equal(html.match(/<body\b/g)?.length, 1)
  assert.equal(html.match(/class="bc-main"/g)?.length, 1)
  const document = JSDOM.fragment(html)
  const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href'))
  assert.ok(styles.length > 0)
  assert.equal(new Set(styles).size, styles.length, 'each inherited stylesheet appears once')
  return document
}

/** @param {string} xml @param {string} selector */
function xmlText (xml, selector) {
  const dom = new JSDOM(xml, { contentType: 'text/xml' })
  try {
    return [...dom.window.document.querySelectorAll(selector)].map(node => node.textContent)
  } finally {
    dom.window.close()
  }
}

/** @param {string} contents @returns {Feed} */
function parseFeed (contents) {
  return JSON.parse(contents)
}

/** @param {TestContext} t */
export async function fullSite (t) {
  const build = await testBuild(join(process.cwd(), 'src', 'client'))
  t.after(() => build.cleanup())
  assertSuccessful(build.results)
  assert.deepEqual(build.results.esbuildResults.errors, [])
  const report = build.results.pageBuildResults
  assert.ok(report)
  const feed = parseFeed(await build.readOutput('feed.json'))

  await t.test('generated archives retain URLs, titles, noindex, entries and one parent/root', async () => {
    const generated = report.report.pages.filter(page => page.pagesFilePath?.endsWith('/blog/archives.pages.js'))
    assert.equal(generated.length, 4)
    const blog = assertRootOnce(await build.readOutput('blog/index.html'))
    for (const year of ['2023', '2024', '2025', '2026']) {
      const output = `blog/${year}/index.html`
      const page = generated.find(page => page.outputs.some(entry => entry.outputRelname === output))
      assert.ok(page, output)
      assert.deepEqual(page.layoutNames, ['root', 'blog-index', 'blog-auto-index'])
      const archive = assertRootOnce(await build.readOutput(output))
      assert.equal(archive.querySelector('title')?.textContent, `All ${year} Blog Posts | Breadcrum`)
      assert.equal(archive.querySelectorAll('h1').length, 1)
      assert.equal(archive.querySelector('h1')?.textContent, `All ${year} Blog Posts`)
      assert.equal(archive.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex,nofollow')
      assert.equal(archive.querySelectorAll('link[href*="blog-index.layout"]').length, 1)
      assert.equal(blog.querySelectorAll(`.archive-list a[href="/blog/${year}/"]`).length, 1)
      const expectedEntries = report.report.pages
        .filter(page => page.layoutNames.includes('article'))
        .flatMap(page => page.outputs)
        .filter(entry => entry.kind === 'page' && entry.outputRelname.startsWith(`blog/${year}/`))
        .map(entry => `/${entry.outputRelname.replace(/index\.html$/, '')}`)
        .sort()
      assert.deepEqual([...archive.querySelectorAll('.blog-entry-link')].map(link => link.getAttribute('href')).sort(), expectedEntries)
      for (const item of feed.items.filter(item => new URL(item.url).pathname.startsWith(`/blog/${year}/`))) {
        const path = new URL(item.url).pathname
        assert.equal(archive.querySelector(`.blog-entry-link[href="${path}"]`)?.textContent, item.title)
        assert.equal(blog.querySelector(`.blog-entry-link[href="${path}"]`)?.textContent, item.title)
      }
    }
  })

  await t.test('docs and articles inherit their wrappers without duplicate content or giscus', async () => {
    const docs = assertRootOnce(await build.readOutput('docs/index.html'))
    assert.equal(docs.querySelectorAll('article[itemtype="http://schema.org/TechArticle"]').length, 1)
    assert.equal(docs.querySelectorAll('.bc-docs-main').length, 1)
    assert.equal(docs.querySelectorAll('.bc-docs-edit-link').length, 2, 'one header and one footer edit link')
    for (const link of docs.querySelectorAll('.bc-docs-edit-link')) {
      assert.equal(link.getAttribute('href'), 'https://github.com/hifiwi-fi/breadcrum.net/blob/master/src/client/docs/README.md')
    }
    assert.equal(docs.querySelectorAll('link[href*="docs.layout"]').length, 1)
    assert.equal(docs.querySelectorAll('giscus-widget').length, 0)
    const article = assertRootOnce(await build.readOutput('blog/2025/frontend-rewrite/index.html'))
    assert.equal(article.querySelectorAll('article.bc-article').length, 1)
    assert.equal(article.querySelectorAll('article .e-content').length, 1)
    assert.equal(article.querySelectorAll('giscus-widget#comments').length, 1)
    assert.equal(article.querySelectorAll('link[href*="article.layout"]').length, 1)
    assert.equal(article.querySelectorAll('script[src*="article.layout"]').length, 1)
    assert.match(article.querySelector('.e-content')?.textContent ?? '', /frontend codebase has been fully rewritten/)
  })

  await t.test('JSON/Atom feeds and sitemap contain published content, not drafts or noindex archives', async () => {
    assert.equal(feed.title, 'Breadcrum')
    assert.equal(feed.home_page_url, origin)
    assert.equal(feed.items.length, 10)
    assert.equal(new Set(feed.items.map(item => item.url)).size, feed.items.length)
    const atom = await build.readOutput('feed.xml')
    assert.deepEqual(xmlText(atom, 'entry > title'), feed.items.map(item => item.title))
    const sitemap = xmlText(await build.readOutput('sitemap.xml'), 'url > loc')
    assert.equal(new Set(sitemap).size, sitemap.length)
    assert.ok(sitemap.includes(`${origin}/docs/`))
    for (const item of feed.items) {
      assert.ok(item.url.startsWith(`${origin}/blog/`))
      assert.ok(sitemap.includes(item.url), item.url)
      assert.ok(item.content_html.length > 0)
      assert.doesNotMatch(item.content_html, /<html\b|<giscus-widget\b/)
    }
    assert.ok(!sitemap.includes(`${origin}/blog/`))
    for (const year of ['2023', '2024', '2025', '2026']) {
      assert.ok(!sitemap.includes(`${origin}/blog/${year}/`))
    }
    assert.doesNotMatch(JSON.stringify(feed), /2025-retrospective/)
    assert.ok(!sitemap.includes(`${origin}/blog/2026/2025-retrospective/`))
  })

  await t.test('native worker and PWA webmanifest build without generating a DOMStack manifest', async () => {
    const files = await readdir(build.dest, { recursive: true })
    assert.deepEqual(files.filter(file => /(?:^|\/)service-worker[^/]*\.js$/.test(file)), ['service-worker.js'])
    assert.equal(build.results.domstackManifest, undefined, 'manifest generation is disabled, not just public JSON output')
    await assert.rejects(build.readOutput('domstack-manifest.json'), { code: 'ENOENT' })
    /** @type {{ name: string, start: () => void }[]} */
    const listeners = []
    /** @type {unknown[][]} */
    const logs = []
    runInNewContext(await build.readOutput('service-worker.js'), {
      self: {
        /** @param {string} name @param {() => void} start */
        addEventListener (name, start) { listeners.push({ name, start }) },
      },
      console: {
        /** @param {unknown[]} args */
        log (...args) { logs.push(args) },
      },
      fetch: () => { assert.fail('Service worker must not fetch or precache') },
      get caches () { return assert.fail('Service worker must not access CacheStorage') },
    }, { timeout: 1000 })
    assert.deepEqual(listeners.map(listener => listener.name), ['install'], 'no fetch interception or precaching')
    assert.ok(listeners[0])
    listeners[0].start()
    assert.deepEqual(logs, [['Service worker installed']])
    const webmanifest = JSON.parse(await build.readOutput('manifest.webmanifest'))
    assert.equal(webmanifest.name, 'Breadcrum')
    assert.equal(webmanifest.start_url, '/bookmarks')
    assert.equal(webmanifest.share_target.action, '/bookmarks/add?jump=close')
    assert.equal(webmanifest.share_target.method, 'GET')
    assert.equal(webmanifest.share_target.enctype, 'application/x-www-form-urlencoded')
    assert.ok(files.includes(webmanifest.icons[0].src.slice(1)))
  })
}
