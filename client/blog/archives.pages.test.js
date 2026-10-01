import assert from 'node:assert/strict'
import { test } from 'node:test'
import archivePages, { dataDeps } from './archives.pages.js'
import { collectSiteData } from '../globals/global.data.js'

test('archive factory subscribes only to archive paths and preserves all existing empty year URLs', async () => {
  const data = await collectSiteData([])
  assert.deepEqual(dataDeps, ['blogArchives'])
  const definitions = archivePages({ data })
  assert.deepEqual(definitions, [2023, 2024, 2025, 2026].map(year => ({
    outputName: `${year}/index.html`,
    vars: {
      title: `All ${year} Blog Posts`,
      layout: 'blog-auto-index',
      noindex: true,
    },
    children: '',
  })))
  assert.deepEqual(data.sitemapPaths, [])
})

test('new article years create archives independently of their publication dates', async () => {
  const data = await collectSiteData([{
    sourceId: 'blog/2028/post/README.md',
    pageInfo: { path: 'blog/2028/post' },
    vars: { layout: 'article', title: 'New post', publishDate: '2027-12-31' },
    renderInnerPage: async () => '<p>Post</p>',
  }])
  const definitions = archivePages({ data })
  assert.deepEqual(definitions.at(-1), {
    outputName: '2028/index.html',
    vars: { title: 'All 2028 Blog Posts', layout: 'blog-auto-index', noindex: true },
    children: '',
  })
  assert.deepEqual(data.blogYearPosts['blog/2028'], data.blogPosts)
  assert.deepEqual(data.sitemapPaths, ['blog/2028/post'])
})
