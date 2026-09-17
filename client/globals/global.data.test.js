/** @import { CollectionPage, CollectionVars } from './global.data.js' */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectSiteData } from './global.data.js'

/**
 * @param {string} path
 * @param {CollectionVars} [vars]
 * @param {string} [content]
 * @returns {CollectionPage}
 */
function sourcePage (path, vars = {}, content = '<p>Content</p>') {
  return {
    pageInfo: { path },
    vars,
    renderInnerPage: async () => content,
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

test('archives preserve discovery order and year indexes include only immediate children in date order', async () => {
  const data = await collectSiteData([
    sourcePage('blog', { noindex: true }),
    sourcePage('blog/2025', { layout: 'blog-auto-index', noindex: true }),
    sourcePage('blog/2026', { layout: 'blog-auto-index', noindex: true }),
    sourcePage('blog/2026/older', { layout: 'article', publishDate: '2026-01-01' }),
    sourcePage('blog/2026/older/nested', { layout: 'article', publishDate: '2026-03-01' }),
    sourcePage('blog/2026/newer', { title: 'Non-article child', publishDate: '2026-02-01' }),
  ])

  assert.deepEqual(data.blogArchives, ['blog/2025', 'blog/2026'])
  assert.deepEqual(data.blogYearPosts['blog/2025'], [])
  assert.deepEqual(data.blogYearPosts['blog/2026']?.map(post => post.path), [
    'blog/2026/newer', 'blog/2026/older',
  ])
  assert.deepEqual(data.blogPosts.map(post => post.path), [
    'blog/2026/older/nested', 'blog/2026/older',
  ])
})

test('sitemap projects indexable paths in discovery order, including root and html paths', async () => {
  const data = await collectSiteData([
    sourcePage(''),
    sourcePage('account', { noindex: true }),
    sourcePage('docs/tags', { noindex: false }),
    sourcePage('about.html'),
  ])

  assert.deepEqual(data.sitemapPaths, ['', 'docs/tags', 'about.html'])
  assert.deepEqual(data.blogPosts, [])
  assert.deepEqual(data.feedPosts, [])
})

test('unrelated body edits leave projections equal while article edits update feed content only', async () => {
  const article = sourcePage('blog/2026/post', {
    layout: 'article', title: 'Post', publishDate: '2026-01-01',
  })
  const before = await collectSiteData([article, sourcePage('docs/tags')])
  const afterDocsEdit = await collectSiteData([article, sourcePage('docs/tags', {}, '<p>Edited docs</p>')])
  assert.deepEqual(afterDocsEdit, before)

  const afterArticleEdit = await collectSiteData([
    sourcePage(article.pageInfo.path, article.vars, '<p>Edited article</p>'),
    sourcePage('docs/tags'),
  ])
  assert.deepEqual(afterArticleEdit, {
    ...before,
    feedPosts: [{ ...before.feedPosts[0], content: '<p>Edited article</p>' }],
  })
})
