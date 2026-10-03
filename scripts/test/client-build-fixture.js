import assert from 'node:assert/strict'
import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { DomStack, testBuild } from '@domstack/static'
import { createDomStackLogger } from '@domstack/static/lib/logger.js'
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
  const build = await testBuild(join(process.cwd(), 'client'))
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
      assert.equal(link.getAttribute('href'), 'https://github.com/hifiwi-fi/breadcrum.net/blob/master/client/docs/README.md')
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
    assert.equal(webmanifest.share_target.action, '/bookmarks/add')
    assert.ok(files.includes(webmanifest.icons[0].src.slice(1)))
  })
}

/** @param {string} path @param {string} before @param {string} after */
async function replaceSource (path, before, after) {
  const source = await readFile(path, 'utf8')
  assert.equal(source.split(before).length, 2, `unique instrumentation/edit target in ${path}`)
  await writeFile(path, source.replace(before, after))
}

/** @param {string} title @param {string} body @param {string} [date] */
function articleSource (title, body, date = '2026-01-01T00:00:00.000Z') {
  return `---\nlayout: article\ntitle: ${title}\npublishDate: '${date}'\n---\n\n${body}\n`
}

/** @param {TestContext} t */
export async function watchSite (t) {
  const src = join(process.cwd(), 'client')
  const dest = join(process.cwd(), 'watch-output')
  // Keep production global data, generated archives, templates, layouts and dependencies.
  // Only content and unused browser entrypoints are reduced for the watch fixture.
  const keep = new Set(['blog', 'globals', 'layouts', 'components', 'hooks', 'lib', 'types', 'feeds.template.js', 'sitemap.xml.template.js', 'layout-registry.d.ts'])
  for (const file of await readdir(src)) {
    if (!keep.has(file)) await rm(join(src, file), { recursive: true, force: true })
  }
  for (const file of await readdir(join(src, 'blog'))) {
    if (!['page.js', 'archives.pages.js', 'style.css'].includes(file)) {
      await rm(join(src, 'blog', file), { recursive: true, force: true })
    }
  }
  await rm(join(src, 'globals/global.client.js'))
  await rm(join(src, 'layouts/article/article.layout.client.js'))
  const docsPath = join(src, 'docs/README.md')
  const articlePath = join(src, 'blog/2026/watch-article/README.md')
  await mkdir(join(src, 'docs'))
  await mkdir(join(src, 'blog/2026/watch-article'), { recursive: true })
  await writeFile(docsPath, '---\nlayout: docs\ntitle: Watch docs\n---\n\nOriginal documentation.\n')
  await writeFile(articlePath, articleSource('Original article', 'Original article body.'))
  const audit = join(process.cwd(), 'feed-audit.log')
  await writeFile(audit, '')
  // Observe real renders without replacing the production data or template implementation.
  await replaceSource(join(src, 'globals/global.data.js'),
    'const content = await page.renderInnerPage()',
    `await (await import('node:fs/promises')).appendFile(${JSON.stringify(audit)}, 'inner:' + id + '\\n')\n      const content = await page.renderInnerPage()`)
  await replaceSource(join(src, 'feeds.template.js'),
    'export default async function * feedsTemplate (args) {',
    `export default async function * feedsTemplate (args) {\n  await (await import('node:fs/promises')).appendFile(${JSON.stringify(audit)}, 'template\\n')`)

  const logger = createDomStackLogger('info')
  /** @type {unknown[][]} */
  const errors = []
  /** @type {string[]} */
  const messages = []
  t.mock.method(logger, 'error', (/** @type {unknown[]} */ ...args) => { errors.push(args) })
  t.mock.method(logger, 'fatal', (/** @type {unknown[]} */ ...args) => { errors.push(args) })
  t.mock.method(logger, 'info', (/** @type {unknown[]} */ ...args) => { messages.push(args.map(String).join(' ')) })
  const watcher = new DomStack(src, dest, { logger })
  t.after(async () => {
    if (watcher.watching) await watcher.stopWatching()
    assert.deepEqual(errors, [], 'watch errors must never be swallowed')
  })
  assertSuccessful(await watcher.watch({ serve: false }))
  await watcher.settled()

  /** @param {string} path */
  const output = path => readFile(join(dest, path), 'utf8')
  const successCount = () => messages.filter(message => message === 'Build Success!').length
  /** @param {() => Promise<void>} change @param {() => Promise<void>} verify */
  async function rebuild (change, verify) {
    const successes = successCount()
    await change()
    // settled() drains known events; waitFor also waits for chokidar to observe the write.
    await t.waitFor(async () => {
      assert.deepEqual(errors, [])
      assert.ok(successCount() > successes, 'successful watch rebuild report')
      await watcher.settled()
      await verify()
      return true
    }, { timeout: 6000, interval: 25 })
    assert.deepEqual(errors, [])
  }

  await t.test('docs edits rebuild matching output without rendering or invalidating feeds', async () => {
    const beforeAudit = await readFile(audit, 'utf8')
    assert.match(beforeAudit, /inner:/)
    assert.match(beforeAudit, /template/)
    const before = await Promise.all(['feed.json', 'feed.xml'].map(async path => ({
      path,
      content: await output(path),
      metadata: await stat(join(dest, path), { bigint: true }),
    })))
    await rebuild(() => appendFile(docsPath, '\nUpdated documentation marker.\n'), async () => {
      assert.match(await output('docs/index.html'), /Updated documentation marker/)
    })
    assert.equal(await readFile(audit, 'utf8'), beforeAudit, 'neither inner feed render nor feed template ran')
    for (const { path, content, metadata } of before) {
      assert.equal(await output(path), content)
      const after = await stat(join(dest, path), { bigint: true })
      assert.equal(after.mtimeNs, metadata.mtimeNs, `${path} was not rewritten`)
      assert.equal(after.ino, metadata.ino, `${path} was not replaced`)
    }
  })

  await t.test('article metadata/body edits update the feed, year and blog', async () => {
    await rebuild(() => writeFile(articlePath, articleSource('Updated article', 'Updated article body.', '2026-02-02T00:00:00.000Z')), async () => {
      const feed = parseFeed(await output('feed.json'))
      assert.equal(feed.items[0]?.title, 'Updated article')
      assert.equal(feed.items[0]?.date_published, '2026-02-02T00:00:00.000Z')
      assert.match(feed.items[0]?.content_html ?? '', /Updated article body/)
      assert.match(await output('feed.xml'), /Updated article body/)
      for (const path of ['blog/index.html', 'blog/2026/index.html', 'blog/2026/watch-article/index.html']) {
        assert.match(await output(path), /Updated article/)
        assert.doesNotMatch(await output(path), /Original article/)
      }
    })
  })

  const newYear = join(src, 'blog/2027/new-year')
  await t.test('adding an article in a new year creates the generated archive and collection links', async () => {
    await rebuild(async () => {
      await mkdir(newYear, { recursive: true })
      await writeFile(join(newYear, 'README.md'), articleSource('New year article', 'New year body.', '2027-01-01T00:00:00.000Z'))
    }, async () => {
      const year = assertRootOnce(await output('blog/2027/index.html'))
      assert.equal(year.querySelector('h1')?.textContent, 'All 2027 Blog Posts')
      assert.equal(year.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex,nofollow')
      assert.equal(year.querySelector('.blog-entry-link')?.getAttribute('href'), '/blog/2027/new-year/')
      assert.equal(year.querySelector('.blog-entry-link')?.textContent, 'New year article')
      const blog = JSDOM.fragment(await output('blog/index.html'))
      assert.equal(blog.querySelectorAll('.archive-list a[href="/blog/2027/"]').length, 1)
      assert.equal(parseFeed(await output('feed.json')).items[0]?.title, 'New year article')
      assert.match(await output('blog/2027/new-year/index.html'), /New year body/)
      assert.ok(xmlText(await output('sitemap.xml'), 'loc').includes(`${origin}/blog/2027/new-year/`))
    })
  })

  await t.test('removing the last article removes its generated year and stale outputs', async () => {
    await rebuild(() => rm(newYear, { recursive: true }), async () => {
      await assert.rejects(output('blog/2027/index.html'), { code: 'ENOENT' })
      await assert.rejects(output('blog/2027/new-year/index.html'), { code: 'ENOENT' })
      assert.doesNotMatch(await output('blog/index.html'), /\/blog\/2027\//)
      for (const path of ['feed.json', 'feed.xml', 'sitemap.xml']) {
        assert.doesNotMatch(await output(path), /\/blog\/2027\//)
      }
      assert.equal(parseFeed(await output('feed.json')).items.length, 1)
      for (const year of ['2023', '2024', '2025', '2026']) {
        assert.match(await output(`blog/${year}/index.html`), new RegExp(`All ${year} Blog Posts`))
      }
    })
  })

  await t.test('parent layout edits propagate through generated, article and docs layout chains', async () => {
    await rebuild(() => replaceSource(join(src, 'layouts/root/root.layout.js'),
      '<body class="bc-body">', '<body class="bc-body" data-watch-parent="updated">'), async () => {
      for (const path of ['blog/index.html', 'blog/2026/index.html', 'blog/2026/watch-article/index.html', 'docs/index.html']) {
        const html = await output(path)
        assert.match(html, /data-watch-parent="updated"/)
        assertRootOnce(html)
      }
    })
  })
}
