/**
 * @import { GeneratedPageForLayout, LayoutChain, LayoutPageOutput, LayoutProvidedVars, LayoutResult, PageForLayout, ValidatePageVars } from '@domstack/static/types.js'
 * @import { VNode } from 'preact'
 * @import { GlobalVars } from '../globals/global.vars.js'
 * @import { SitePage, SitePageVars } from './site-page.js'
 */

// Compile-time tests only; these fixtures are not browser entry points or generated assets.
// Each @ts-expect-error asserts that invalid usage is rejected, rather than hiding an application error.
// tsc fails if a type change makes one of these invalid examples acceptable.

/** @type {LayoutChain<'blog-auto-index'>} */
export const blogChain = ['root', 'blog-index', 'blog-auto-index']

/** @type {LayoutChain<'article'>} */
export const articleChain = ['root', 'article']

/** @type {LayoutChain<'docs'>} */
export const docsChain = ['root', 'docs']

/** @type {LayoutResult<'article'>} */
export const rootResult = '<!DOCTYPE html><html></html>'

/** @type {SitePage<'root'>} */
export const rootPage = ({ vars }) => vars.siteName

/** @type {SitePage<'docs'>} */
export const docsPage = ({ vars }) => vars.title

/** @type {SitePage<'article'>} */
export const articlePage = ({ vars }) => vars.publishDate

/** @type {SitePage<'blog-index'>} */
export const blogIndexPage = ({ vars }) => vars.title

/** @type {SitePage<'blog-auto-index'>} */
export const blogAutoIndexPage = ({ vars }) => vars.title

/** @param {VNode} content */
export function preactContent (content) {
  /** @type {LayoutPageOutput<'docs'>} */
  const children = content
  return children
}

/** @type {SitePageVars<'article', { title: string, publishDate: string, updatedDate: string }>} */
export const articleVars = {
  title: 'Article',
  publishDate: '2026-10-01',
  updatedDate: '2026-10-01',
}

/** @type {SitePageVars<'blog-auto-index', { title: string }>} */
export const blogVars = { title: 'All 2026 Blog Posts' }

/** @type {GeneratedPageForLayout<'blog-auto-index', { title: string }, Record<string, never>, GlobalVars>} */
export const generatedBlogIndex = {
  outputName: 'blog/2026/index.html',
  vars: { layout: 'blog-auto-index', title: 'All 2026 Blog Posts' },
  children: '',
}

/** @type {SitePage<'blog-auto-index', {}, { count: number }>} */
export const ownPageData = ({ data }) => {
  /** @type {number} */
  const count = data.count
  // @ts-expect-error Layout subscriptions do not leak into a page's data contract.
  String(data.blogYearPosts)
  return String(count)
}

/** @param {LayoutProvidedVars<'blog-auto-index'>} defaults */
export function subscriptionMetadata (defaults) {
  // @ts-expect-error dataDeps is subscription metadata, not a resolved layout default.
  return defaults.dataDeps
}

/** @type {PageForLayout<'missing-layout'>} */
// @ts-expect-error Unknown layout names resolve to never.
export const invalidLayout = () => ''

/** @type {SitePageVars<'blog-index', {}>} */
// @ts-expect-error The blog index requires a title from the page or globals.
export const missingTitle = {}

/** @type {SitePageVars<'article', { title: string }>} */
// @ts-expect-error Article dates have no layout or global defaults.
export const missingDates = { title: 'Article' }

/** @type {ValidatePageVars<'root', {}, {}>} */
// @ts-expect-error The root renderer requires the actual global vars provider.
export const missingGlobals = {}

/** @type {SitePageVars<'root', { siteName: number }>} */
// @ts-expect-error A page cannot override a required global string with a number.
export const wrongOverride = { siteName: 123 }

/** @type {SitePage<'root'>} */
// @ts-expect-error The Preact root renderer does not accept numeric page results.
export const wrongContent = () => 123

/** @type {GeneratedPageForLayout<'blog-auto-index', { title: string }, Record<string, never>, GlobalVars>} */
export const wrongGeneratedContent = {
  outputName: 'blog/2026/index.html',
  vars: { layout: 'blog-auto-index', title: 'All 2026 Blog Posts' },
  // @ts-expect-error Generated static children must satisfy the innermost renderer.
  children: 123,
}

/** @type {GeneratedPageForLayout<'blog-auto-index', { title: string }, Record<string, never>, GlobalVars>} */
export const wrongGeneratedLayout = {
  outputName: 'blog/2026/index.html',
  // @ts-expect-error The runtime selector must match the registered chain.
  vars: { layout: 'blog-index', title: 'All 2026 Blog Posts' },
}
