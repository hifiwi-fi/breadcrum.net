/**
 * @import { CollectionChanges, CollectionPage, CollectionState, CollectionVars } from './global.data.js'
 * @import { PageReturn } from '#layouts/root/root.layout.js'
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { html } from 'htm/preact'
import globalData, { collectSiteData } from './global.data.js'

/**
 * @param {string} path
 * @param {CollectionVars} [vars]
 * @param {PageReturn} [content]
 * @param {string} [sourceId]
 * @returns {CollectionPage}
 */
function sourcePage (path, vars = {}, content = '<p>Content</p>', sourceId = `${path}/page.js`) {
  return {
    sourceId,
    pageInfo: { path },
    vars,
    renderInnerPage: async () => content,
  }
}

/** @param {CollectionPage[]} upserted @param {string[]} [removed] @returns {CollectionChanges} */
function delta (upserted, removed = []) {
  return { kind: 'delta', upserted, removed, events: [] }
}

function session () {
  /** @type {CollectionState | undefined} */
  let state
  return {
    get state () { return state },
    /** @param {CollectionPage[]} pages @param {CollectionChanges} [changes] */
    async build (pages, changes = { kind: 'reset', reason: 'test reset', events: [] }) {
      /** @type {CollectionState | undefined} */
      let nextState
      const data = await globalData({ pages, previousState: state, changes, setState: next => { nextState = next } })
      // Like DOMStack, commit only successful builds, and check that snapshots clone.
      state = structuredClone(nextState)
      return data
    },
  }
}

test('blog and feed projections sort newest first, enforce limits, and only render feed entries', async t => {
  const articles = Array.from({ length: 55 }, (_, index) => sourcePage(`blog/2026/post-${index}`, {
    layout: 'article',
    title: `Post ${index}`,
    publishDate: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    noindex: true,
  }))
  const renderers = articles.map(page => t.mock.method(page, 'renderInnerPage'))
  const docs = sourcePage('docs/tags', { title: 'Tags', publishDate: '2027-01-01' })
  const docsRenderer = t.mock.method(docs, 'renderInnerPage')
  const pages = [...articles, docs]
  const originalOrder = [...pages]

  const data = await collectSiteData(pages)

  assert.deepEqual(data.blogPosts.map(post => post.path),
    Array.from({ length: 50 }, (_, index) => `blog/2026/post-${54 - index}`))
  assert.deepEqual(data.feedPosts.map(post => post.path),
    Array.from({ length: 10 }, (_, index) => `blog/2026/post-${54 - index}`))
  assert.deepEqual(data.feedPosts[0], {
    path: 'blog/2026/post-54',
    title: 'Post 54',
    publishDate: '2026-02-24T00:00:00.000Z',
    content: '<p>Content</p>',
  })
  assert.equal(docsRenderer.mock.callCount(), 0)
  assert.deepEqual(renderers.map(renderer => renderer.mock.callCount()), [
    ...Array.from({ length: 45 }, () => 0),
    ...Array.from({ length: 10 }, () => 1),
  ])
  assert.deepEqual(pages, originalOrder)
})

test('archives derive from article paths without placeholder pages, retaining empty published years', async () => {
  const data = await collectSiteData([
    sourcePage('blog', { noindex: true }),
    sourcePage('blog/2026/older', { layout: 'article', publishDate: '2026-01-01' }),
    sourcePage('blog/2026/older/nested', { layout: 'article', publishDate: '2026-03-01' }),
    sourcePage('blog/2026/newer', { title: 'Non-article child', publishDate: '2026-02-01' }),
    sourcePage('blog/2028/new', { layout: 'article', publishDate: '2027-01-01' }),
    sourcePage('docs/2029/not-a-year', { layout: 'article' }),
  ])

  assert.deepEqual(data.blogArchives, ['blog/2023', 'blog/2024', 'blog/2025', 'blog/2026', 'blog/2028'])
  assert.deepEqual(data.blogYearPosts['blog/2025'], [])
  assert.deepEqual(data.blogYearPosts['blog/2026']?.map(post => post.path), [
    'blog/2026/newer', 'blog/2026/older',
  ])
  assert.deepEqual(data.blogYearPosts['blog/2028']?.map(post => post.path), ['blog/2028/new'])
  assert.ok(!Object.hasOwn(data.blogYearPosts, 'blog/2027'))
})

test('sitemap projects indexable source paths in discovery order, including root and html paths', async () => {
  const data = await collectSiteData([
    sourcePage(''),
    sourcePage('account', { noindex: true }),
    sourcePage('docs/tags', { noindex: false }),
    sourcePage('about.html'),
  ])

  assert.deepEqual(data.sitemapPaths, ['', 'docs/tags', 'about.html'])
  assert.deepEqual(data.blogPosts, [])
  assert.deepEqual(data.feedPosts, [])
  assert.ok(data.blogArchives.every(path => !data.sitemapPaths.includes(path)))
})

test('unrelated docs edits reuse projections and never rerender feed articles', async t => {
  const article = sourcePage('blog/2026/post', {
    layout: 'article', title: 'Post', publishDate: '2026-01-01',
  })
  const renderer = t.mock.method(article, 'renderInnerPage')
  const docs = sourcePage('docs/tags')
  const build = session()
  const before = await build.build([article, docs])
  const snapshot = build.state
  const original = structuredClone(snapshot)
  const edited = sourcePage('docs/tags', { title: 'Edited title' }, '<p>Edited docs</p>')
  const editedRenderer = t.mock.method(edited, 'renderInnerPage')
  const after = await build.build([article, edited], delta([edited]))
  assert.deepEqual(after, before)
  assert.strictEqual(after.blogPosts, snapshot?.data.blogPosts)
  assert.strictEqual(after.blogArchives, snapshot?.data.blogArchives)
  assert.strictEqual(after.blogYearPosts['blog/2026'], snapshot?.data.blogYearPosts['blog/2026'])
  assert.strictEqual(after.feedPosts, snapshot?.data.feedPosts)
  assert.strictEqual(after.sitemapPaths, snapshot?.data.sitemapPaths)
  assert.deepEqual(snapshot, original)
  assert.equal(renderer.mock.callCount(), 1)
  assert.equal(editedRenderer.mock.callCount(), 0)
})

test('article body edits render only the changed feed entry and preserve listing projections', async t => {
  const article = sourcePage('blog/2026/post', { layout: 'article', title: 'Post', publishDate: '2026-01-01' })
  const other = sourcePage('blog/2025/post', { layout: 'article', publishDate: '2025-01-01' })
  const otherRenderer = t.mock.method(other, 'renderInnerPage')
  const build = session()
  const before = await build.build([article, other])
  const snapshot = build.state
  const edited = sourcePage(article.pageInfo.path, article.vars, '<p>Edited article</p>')
  const renderer = t.mock.method(edited, 'renderInnerPage')
  const after = await build.build([edited, other], delta([edited]))
  assert.deepEqual(after, {
    ...before,
    feedPosts: [{ ...before.feedPosts[0], content: '<p>Edited article</p>' }, before.feedPosts[1]],
  })
  assert.strictEqual(after.blogPosts, snapshot?.data.blogPosts)
  assert.strictEqual(after.blogYearPosts['blog/2026'], snapshot?.data.blogYearPosts['blog/2026'])
  assert.strictEqual(after.feedPosts[1], snapshot?.data.feedPosts[1])
  assert.equal(renderer.mock.callCount(), 1)
  assert.equal(otherRenderer.mock.callCount(), 1)
})

test('metadata edits affect only their year, blog/feed ordering, and changed sitemap eligibility', async () => {
  const older = sourcePage('blog/2025/post', { layout: 'article', title: 'Older', publishDate: '2025-01-01' })
  const newer = sourcePage('blog/2026/post', { layout: 'article', title: 'Newer', publishDate: '2026-01-01' })
  const build = session()
  await build.build([older, newer])
  const snapshot = build.state
  const edited = sourcePage(older.pageInfo.path, { ...older.vars, title: 'Edited', publishDate: '2027-01-01', noindex: true })
  const after = await build.build([edited, newer], delta([edited]))
  assert.deepEqual(after.blogPosts.map(post => post.title), ['Edited', 'Newer'])
  assert.deepEqual(after.feedPosts.map(post => post.title), ['Edited', 'Newer'])
  assert.strictEqual(after.blogYearPosts['blog/2026'], snapshot?.data.blogYearPosts['blog/2026'])
  assert.deepEqual(after.blogYearPosts['blog/2025'], [after.blogPosts[0]])
  assert.deepEqual(after.sitemapPaths, [newer.pageInfo.path])
})

test('stable source IDs handle moved paths, removals, additions, and article layout changes', async () => {
  const original = sourcePage('blog/2027/old', { layout: 'article', publishDate: '2027-01-01' }, 'Original', 'posts/stable.md')
  const build = session()
  await build.build([original])
  const moved = sourcePage('blog/2028/new', original.vars, 'Moved', original.sourceId)
  const added = sourcePage('blog/2029/add', { layout: 'article', publishDate: '2029-01-01' })
  const after = await build.build([moved, added], delta([moved, added]))
  assert.deepEqual(after.blogArchives, ['blog/2023', 'blog/2024', 'blog/2025', 'blog/2026', 'blog/2028', 'blog/2029'])
  assert.ok(!Object.hasOwn(after.blogYearPosts, 'blog/2027'))
  assert.deepEqual(after.sitemapPaths, ['blog/2028/new', 'blog/2029/add'])
  assert.deepEqual(after.feedPosts.map(post => post.content), ['<p>Content</p>', 'Moved'])

  const nonArticle = sourcePage(moved.pageInfo.path, { ...moved.vars, layout: 'docs' }, 'Not an article', moved.sourceId)
  const removed = await build.build([nonArticle], delta([nonArticle], [added.sourceId]))
  assert.deepEqual(removed.blogArchives, ['blog/2023', 'blog/2024', 'blog/2025', 'blog/2026'])
  assert.deepEqual(removed.blogPosts, [])
  assert.deepEqual(removed.feedPosts, [])
  assert.deepEqual(removed.sitemapPaths, [moved.pageInfo.path])
  assert.deepEqual([...build.state?.entries.keys() ?? []], [original.sourceId])

  const empty = await build.build([], delta([], [nonArticle.sourceId]))
  assert.deepEqual(empty, await collectSiteData([]))
})

test('feed boundary changes render newly eligible entries and do not retain stale evicted content', async t => {
  const articles = Array.from({ length: 11 }, (_, index) => sourcePage(`blog/2026/post-${index}`, {
    layout: 'article', publishDate: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }))
  const renderers = articles.map(page => t.mock.method(page, 'renderInnerPage'))
  const build = session()
  await build.build(articles)
  const oldest = articles[0]
  const newest = articles[10]
  assert.ok(oldest && newest)
  const editedOldest = sourcePage(oldest.pageInfo.path, oldest.vars, 'Updated while outside feed')
  const oldestRenderer = t.mock.method(editedOldest, 'renderInnerPage')
  const editedPages = [editedOldest, ...articles.slice(1)]
  await build.build(editedPages, delta([editedOldest]))
  assert.equal(oldestRenderer.mock.callCount(), 0)
  const afterRemoval = await build.build(editedPages.slice(0, 10), delta([], [newest.sourceId]))
  assert.equal(afterRemoval.feedPosts[9]?.content, 'Updated while outside feed')
  assert.equal(oldestRenderer.mock.callCount(), 1)
  assert.deepEqual(renderers.map(renderer => renderer.mock.callCount()), [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])

  await build.build(editedPages, delta([newest]))
  assert.equal(renderers[10]?.mock.callCount(), 2)
  await build.build(editedPages.slice(0, 10), delta([], [newest.sourceId]))
  assert.equal(oldestRenderer.mock.callCount(), 2)
})

test('equal-date entries and sitemap paths follow current source discovery order after reordering', async () => {
  const first = sourcePage('blog/2026/first', { layout: 'article', publishDate: '2026-01-01' })
  const second = sourcePage('blog/2026/second', first.vars)
  const build = session()
  await build.build([first, second])
  const after = await build.build([second, first], delta([]))
  assert.deepEqual(after, await collectSiteData([second, first]))
  assert.deepEqual(after.blogPosts.map(post => post.path), [second.pageInfo.path, first.pageInfo.path])
})

test('delta without saved state and explicit resets rebuild from all current sources', async t => {
  const article = sourcePage('blog/2026/post', { layout: 'article' })
  const renderer = t.mock.method(article, 'renderInnerPage')
  const docs = sourcePage('docs/tags')
  const build = session()
  const initial = await build.build([article, docs], delta([docs], ['removed/page.js']))
  assert.equal(initial.feedPosts.length, 1)
  assert.equal(renderer.mock.callCount(), 1)
  const afterReset = await build.build([article])
  assert.deepEqual(afterReset.sitemapPaths, [article.pageInfo.path])
  assert.equal(renderer.mock.callCount(), 2)
})

test('failed renders do not save or mutate previous state, and reset recovers current content', async t => {
  const article = sourcePage('blog/2026/post', { layout: 'article', title: 'Original' })
  const build = session()
  await build.build([article])
  const snapshot = build.state
  const original = structuredClone(snapshot)
  const broken = sourcePage(article.pageInfo.path, { ...article.vars, title: 'Broken' })
  t.mock.method(broken, 'renderInnerPage', async () => { throw new Error('render failed') })
  const save = t.mock.fn()
  await assert.rejects(globalData({
    pages: [broken], previousState: snapshot, changes: delta([broken]), setState: save,
  }), /render failed/)
  assert.equal(save.mock.callCount(), 0)
  assert.deepEqual(snapshot, original)

  const repaired = sourcePage(article.pageInfo.path, { ...article.vars, title: 'Repaired' }, 'Recovered')
  const recovered = await build.build([repaired])
  assert.equal(recovered.feedPosts[0]?.title, 'Repaired')
  assert.equal(recovered.feedPosts[0]?.content, 'Recovered')
})

test('a later build failure can discard a staged snapshot without poisoning the committed baseline', async () => {
  const article = sourcePage('blog/2026/post', { layout: 'article' })
  const build = session()
  const before = await build.build([article])
  const baseline = build.state
  const snapshot = structuredClone(baseline)
  const changed = sourcePage(article.pageInfo.path, article.vars, 'Uncommitted edit')
  /** @type {CollectionState | undefined} */
  let staged
  await globalData({ pages: [changed], previousState: baseline, changes: delta([changed]), setState: next => { staged = next } })
  assert.equal(staged?.data.feedPosts[0]?.content, 'Uncommitted edit')
  assert.deepEqual(baseline, snapshot)
  const retried = await build.build([article])
  assert.deepEqual(retried, before)
})

test('rendered Preact feed content is HTML and saved state is structured-cloneable', async () => {
  const article = sourcePage('blog/2026/post', { layout: 'article' }, html`<p>Hello <strong>world</strong></p>`)
  const build = session()
  const data = await build.build([article])
  assert.equal(data.feedPosts[0]?.content, '<p>Hello <strong>world</strong></p>')
  assert.deepEqual(structuredClone(build.state), build.state)
})
