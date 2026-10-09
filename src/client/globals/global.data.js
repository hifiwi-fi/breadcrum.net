/**
 * @import { GlobalDataFunctionParams } from '@domstack/static/types.js'
 * @import { PageReturn } from '../layouts/root/root.layout.js'
 */
import { posix } from 'node:path'
import pMap from 'p-map'
import { render } from 'preact-render-to-string'

/**
 * @typedef {Object} CollectionVars
 * @property {string} [layout]
 * @property {string} [title]
 * @property {string} [publishDate]
 * @property {boolean} [noindex]
 *
 * @typedef {GlobalDataFunctionParams<CollectionVars, PageReturn, CollectionState>} DataParams
 * @typedef {DataParams['pages'][number]} SourcePage
 * @typedef {Pick<SourcePage, 'sourceId' | 'vars' | 'renderInnerPage'> & { pageInfo: Pick<SourcePage['pageInfo'], 'path'> }} CollectionPage
 * @typedef {Extract<DataParams['changes'], { kind: 'delta' }>} DeltaChanges
 * @typedef {Extract<DataParams['changes'], { kind: 'reset' }> | (Omit<DeltaChanges, 'upserted'> & { upserted: CollectionPage[] })} CollectionChanges
 * @typedef {Omit<DataParams, 'pages' | 'changes'> & { pages: CollectionPage[], changes: CollectionChanges }} CollectionParams
 *
 * @typedef {Object} BlogEntry
 * @property {string} path
 * @property {string | undefined} title
 * @property {string | undefined} publishDate
 *
 * @typedef {BlogEntry & { content: string }} FeedEntry
 * @typedef {{ blogPosts: BlogEntry[], blogArchives: string[] }} BlogIndexData
 * @typedef {{ blogYearPosts: Record<string, BlogEntry[]> }} BlogYearData
 * @typedef {{ feedPosts: FeedEntry[] }} FeedData
 * @typedef {{ sitemapPaths: string[] }} SitemapData
 * @typedef {BlogIndexData & BlogYearData & FeedData & SitemapData} GlobalData
 * @typedef {{ entry: BlogEntry, article: boolean, indexable: boolean }} IndexedPage
 * @typedef {{ entries: Map<string, IndexedPage>, order: string[], articleIds: string[], feed: Map<string, FeedEntry>, data: GlobalData }} CollectionState
 */

// These published archive URLs survive even when a year has no published articles.
const preservedArchives = ['blog/2023', 'blog/2024', 'blog/2025', 'blog/2026']

/**
 * State contains only cloneable projections, never live pages or render functions.
 * Build a new snapshot so a failed render cannot mutate the last successful state.
 * @param {CollectionParams} params
 * @returns {Promise<GlobalData>}
 */
export default async function globalData ({ pages, previousState, changes, setState }) {
  const previous = changes.kind === 'reset' ? undefined : previousState
  const entries = new Map(previous?.entries)
  const inputs = changes.kind === 'delta' && previous ? changes.upserted : pages
  const changedIds = new Set(inputs.map(page => page.sourceId))
  const order = pages.map(page => page.sourceId)
  const oldIds = new Set(previous?.order)
  const currentIds = new Set(order)
  const reordered = !sameItems(
    previous?.order.filter(id => currentIds.has(id)) ?? [],
    order.filter(id => oldIds.has(id))
  )
  let articlesChanged = !previous || reordered
  let archivesChanged = !previous
  let sitemapChanged = !previous || reordered
  const changedYears = new Set(reordered ? previous?.data.blogArchives : [])

  /**
   * @param {IndexedPage | undefined} before
   * @param {IndexedPage | undefined} after
   */
  function trackChanges (before, after) {
    const metadataChanged = !before || !after || !sameEntry(before.entry, after.entry)
    if (metadataChanged || before?.article !== after?.article) {
      if (before?.article || after?.article) articlesChanged = true
    }
    if (before?.entry.path !== after?.entry.path || before?.article !== after?.article) {
      if (before?.article || after?.article) archivesChanged = true
    }
    if (metadataChanged) {
      if (before) changedYears.add(posix.dirname(before.entry.path))
      if (after) changedYears.add(posix.dirname(after.entry.path))
    }
    if (before?.entry.path !== after?.entry.path || before?.indexable !== after?.indexable) {
      if (before?.indexable || after?.indexable) sitemapChanged = true
    }
  }

  if (changes.kind === 'delta' && previous) {
    for (const id of changes.removed) {
      trackChanges(entries.get(id), undefined)
      entries.delete(id)
    }
  }
  for (const page of inputs) {
    const before = entries.get(page.sourceId)
    const after = {
      entry: blogEntry(page),
      article: page.vars.layout === 'article',
      indexable: !page.vars.noindex,
    }
    trackChanges(before, after)
    entries.set(page.sourceId, after)
  }

  /** @param {string} id */
  function indexedPage (id) {
    const entry = entries.get(id)
    if (!entry) throw new Error(`Missing global-data source: ${id}`)
    return entry
  }

  const articleIds = articlesChanged || !previous
    ? order.filter(id => indexedPage(id).article)
      .sort((a, b) => publishTime(indexedPage(b).entry.publishDate) - publishTime(indexedPage(a).entry.publishDate))
    : previous.articleIds
  const blogPosts = articlesChanged || !previous
    ? articleIds.slice(0, 50).map(id => indexedPage(id).entry)
    : previous.data.blogPosts
  const blogArchives = archivesChanged || !previous
    ? [...new Set([...preservedArchives, ...articleIds.flatMap(id => {
        const year = /^blog\/\d{4}(?=\/)/.exec(indexedPage(id).entry.path)?.[0]
        return year ? [year] : []
      })])].sort()
    : previous.data.blogArchives

  const blogYearPosts = { ...previous?.data.blogYearPosts }
  for (const year of Object.keys(blogYearPosts)) {
    if (!blogArchives.includes(year)) delete blogYearPosts[year]
  }
  for (const year of blogArchives) {
    if (!blogYearPosts[year] || changedYears.has(year)) {
      blogYearPosts[year] = order
        .map(id => indexedPage(id).entry)
        .filter(entry => posix.dirname(entry.path) === year)
        .sort((a, b) => publishTime(b.publishDate) - publishTime(a.publishDate))
    }
  }

  const feedIds = articleIds.slice(0, 10)
  const feedChanged = !previous || !sameItems(feedIds, [...previous.feed.keys()]) || feedIds.some(id => changedIds.has(id))
  const currentPages = new Map(pages.map(page => [page.sourceId, page]))
  const feed = feedChanged
    ? new Map(await pMap(feedIds, async id => {
      const cached = previous?.feed.get(id)
      if (cached && !changedIds.has(id)) return /** @type {const} */ ([id, cached])
      const page = currentPages.get(id)
      if (!page) throw new Error(`Missing feed source: ${id}`)
      const content = await page.renderInnerPage()
      const entry = { ...indexedPage(id).entry, content: typeof content === 'string' ? content : render(content) }
      return /** @type {const} */ ([id, entry])
    }, { concurrency: 4 }))
    : previous.feed

  const data = {
    blogPosts,
    blogArchives,
    blogYearPosts,
    feedPosts: feedChanged ? [...feed.values()] : previous.data.feedPosts,
    sitemapPaths: sitemapChanged || !previous
      ? order.filter(id => indexedPage(id).indexable).map(id => indexedPage(id).entry.path)
      : previous.data.sitemapPaths,
  }
  setState({ entries, order, articleIds, feed, data })
  return data
}

/**
 * Collect a fresh snapshot outside DOMStack, without retaining state between calls.
 * @param {CollectionPage[]} pages
 * @returns {Promise<GlobalData>}
 */
export async function collectSiteData (pages) {
  return globalData({
    pages,
    previousState: undefined,
    changes: { kind: 'reset', reason: 'fresh collection', events: [] },
    setState: () => {},
  })
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

/** @param {BlogEntry} a @param {BlogEntry} b */
function sameEntry (a, b) {
  return a.path === b.path && a.title === b.title && a.publishDate === b.publishDate
}

/** @param {string[]} a @param {string[]} b */
function sameItems (a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/** @param {string | undefined} date */
function publishTime (date) {
  return date === undefined ? NaN : new Date(date).getTime()
}
