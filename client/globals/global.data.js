/**
 * @import { GlobalDataFunction } from '@domstack/static/types.js'
 * @import { PageReturn } from '../layouts/root/root.layout.js'
 */
import { dirname } from 'node:path'
import pMap from 'p-map'

/**
 * @typedef {Object} CollectionVars
 * @property {string} [layout]
 * @property {string} [title]
 * @property {string} [publishDate]
 * @property {boolean} [noindex]
 *
 * @typedef {Object} CollectionPage
 * @property {{ path: string }} pageInfo
 * @property {CollectionVars} vars
 * @property {() => Promise<PageReturn>} renderInnerPage
 *
 * @typedef {Object} BlogEntry
 * @property {string} path
 * @property {string | undefined} title
 * @property {string | undefined} publishDate
 *
 * @typedef {BlogEntry & { content: PageReturn }} FeedEntry
 * @typedef {{ blogPosts: BlogEntry[], blogArchives: string[] }} BlogIndexData
 * @typedef {{ blogYearPosts: Record<string, BlogEntry[]> }} BlogYearData
 * @typedef {{ feedPosts: FeedEntry[] }} FeedData
 * @typedef {{ sitemapPaths: string[] }} SitemapData
 * @typedef {BlogIndexData & BlogYearData & FeedData & SitemapData} GlobalData
 */

/** @type {GlobalDataFunction<GlobalData, CollectionVars, PageReturn>} */
export default function globalData ({ pages }) {
  return collectSiteData(pages)
}

/**
 * Only project values used by consumers so unrelated page edits do not invalidate them.
 * @param {CollectionPage[]} pages
 * @returns {Promise<GlobalData>}
 */
export async function collectSiteData (pages) {
  const articles = pages
    .filter(page => page.vars.layout === 'article')
    .sort((a, b) => publishTime(b.vars.publishDate) - publishTime(a.vars.publishDate))

  /** @type {Record<string, BlogEntry[]>} */
  const blogYearPosts = {}
  for (const index of pages.filter(page => page.vars.layout === 'blog-auto-index')) {
    blogYearPosts[index.pageInfo.path] = pages
      .filter(page => dirname(page.pageInfo.path) === index.pageInfo.path)
      .map(blogEntry)
      .sort((a, b) => publishTime(b.publishDate) - publishTime(a.publishDate))
  }

  return {
    blogPosts: articles.slice(0, 50).map(blogEntry),
    blogArchives: pages
      .filter(page => dirname(page.pageInfo.path) === 'blog')
      .map(page => page.pageInfo.path),
    blogYearPosts,
    feedPosts: await pMap(articles.slice(0, 10), async page => ({
      ...blogEntry(page),
      content: await page.renderInnerPage(),
    }), { concurrency: 4 }),
    sitemapPaths: pages
      .filter(page => !page.vars.noindex)
      .map(page => page.pageInfo.path),
  }
}

/**
 * @param {CollectionPage} page
 * @returns {BlogEntry}
 */
function blogEntry (page) {
  return {
    path: page.pageInfo.path,
    title: page.vars.title,
    publishDate: page.vars.publishDate,
  }
}

/** @param {string | undefined} date */
function publishTime (date) {
  return date === undefined ? NaN : new Date(date).getTime()
}
