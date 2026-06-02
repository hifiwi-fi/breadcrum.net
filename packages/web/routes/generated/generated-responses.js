/**
 * @import { FastifyInstance } from 'fastify'
 * @import { ViewContext } from '#views/context.js'
 * @import { BlogPostSummary } from '../blog/blog-posts.js'
 */

import { readdir } from 'node:fs/promises'
import path from 'node:path'
import jsonfeedToAtom from 'jsonfeed-to-atom'
import { createDefaultViewContext } from '#views/context.js'
import { contentSectionPath, loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { loadBlogPosts } from '../blog/blog-posts.js'

/**
 * @typedef {object} JsonFeedAuthor
 * @property {string} name
 * @property {string} url
 * @property {string} avatar
 */

/**
 * @typedef {object} JsonFeedItem
 * @property {string} id
 * @property {string} url
 * @property {string} title
 * @property {string} date_published
 * @property {string} content_html
 */

/**
 * @typedef {object} JsonFeed
 * @property {string} version
 * @property {string} title
 * @property {string} home_page_url
 * @property {string} feed_url
 * @property {string} description
 * @property {JsonFeedAuthor} author
 * @property {JsonFeedItem[]} items
 */

const publicStaticSitemapPaths = [
  '/',
  '/about/',
  '/docs/',
  '/legal/',
  '/blog/',
  '/login/',
  '/register/',
  '/password_reset/',
  '/password_reset/confirm/',
]

/**
 * @param {FastifyInstance} fastify
 * @returns {string}
 */
export function robotsTxt (fastify) {
  const { baseUrl } = createDefaultViewContext(fastify)
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
}

/**
 * @param {FastifyInstance} fastify
 * @returns {string}
 */
export function opensearchXml (fastify) {
  const { baseUrl, siteName } = createDefaultViewContext(fastify)
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>${escapeXml(siteName)}</ShortName>
  <Description>Search Breadcrum for Bookmarks</Description>
  <Image width="16" height="16" type="image/x-icon">${escapeXml(`${baseUrl}/favicon.ico`)}</Image>
  <Url type="text/html" method="get" template="${escapeXml(`${baseUrl}/search/bookmarks/?query={searchTerms}`)}"/>
  <moz:SearchForm>${escapeXml(`${baseUrl}/search/bookmarks/`)}</moz:SearchForm>
  <Url type="application/opensearchdescription+xml" rel="self" template="${escapeXml(`${baseUrl}/opensearch.xml`)}"/>
  <Language>en-us</Language>
  <OutputEncoding>UTF-8</OutputEncoding>
  <InputEncoding>UTF-8</InputEncoding>
</OpenSearchDescription>
`
}

/**
 * @param {FastifyInstance} fastify
 * @returns {string}
 */
export function giscusJson (fastify) {
  const { baseUrl } = createDefaultViewContext(fastify)
  return JSON.stringify({
    origins: [baseUrl],
    originsRegex: ['http://localhost:[0-9]+'],
  }, null, ' ')
}

/**
 * @param {FastifyInstance} _fastify
 * @returns {string}
 */
export function serviceWorkerJs (_fastify) {
  return `self.addEventListener('install', (event) => {
  console.log('Service worker installed')
})
`
}

/**
 * @param {FastifyInstance} fastify
 * @returns {string}
 */
export function manifestWebmanifest (fastify) {
  const {
    siteName,
    siteDescription,
    themeColorLight,
  } = createDefaultViewContext(fastify)

  return JSON.stringify({
    id: '/bookmarks/',
    name: siteName,
    short_name: siteName,
    lang: 'en',
    dir: 'ltr',
    categories: ['productivity', 'utilities', 'social'],
    description: siteDescription,
    start_url: '/bookmarks/',
    display: 'minimal-ui',
    theme_color: themeColorLight,
    background_color: '#ffffff',
    screenshots: [
      {
        src: '/static/screenshots/bookmark-window-light.png',
        sizes: '1730x2724',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Bookmark listing showing bookmarks with episodes and archives',
      },
      {
        src: '/static/screenshots/feed-window-light.png',
        sizes: '1794x1728',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Feed listing showing episodes sent to a podcast app',
      },
    ],
    icons: [
      {
        src: '/static/breadcrum-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/static/breadcrum-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/static/apple-icons/apple-icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    share_target: {
      action: '/bookmarks/add/',
      method: 'GET',
      params: {
        title: 'title',
        text: 'summary',
        url: 'url',
      },
    },
  }, null, 2)
}

/**
 * @param {FastifyInstance} fastify
 * @returns {Promise<JsonFeed>}
 */
export async function blogJsonFeed (fastify) {
  const context = generatedViewContext(fastify, '/feed.json')
  const posts = (await loadBlogPosts()).slice(0, 10)

  return {
    version: 'https://jsonfeed.org/version/1',
    title: context.siteName,
    home_page_url: context.baseUrl,
    feed_url: `${context.baseUrl}/feed.json`,
    description: context.siteDescription,
    author: {
      name: 'Breadcrum',
      url: context.baseUrl,
      avatar: `${context.baseUrl}/static/breadcrum-fill-red.png`,
    },
    items: await Promise.all(posts.map(post => blogFeedItem(post, context))),
  }
}

/**
 * @param {FastifyInstance} fastify
 * @returns {Promise<string>}
 */
export async function blogJsonFeedString (fastify) {
  return JSON.stringify(await blogJsonFeed(fastify), null, '  ')
}

/**
 * @param {FastifyInstance} fastify
 * @returns {Promise<string>}
 */
export async function blogAtomFeedString (fastify) {
  return jsonfeedToAtom(await blogJsonFeed(fastify))
}

/**
 * @param {FastifyInstance} fastify
 * @returns {Promise<string>}
 */
export async function sitemapXml (fastify) {
  const { baseUrl } = createDefaultViewContext(fastify)
  const paths = new Set(publicStaticSitemapPaths)

  for (const routePath of await markdownRoutePaths('docs', '/docs/')) {
    if (routePath !== '/docs/bookmarklets/') paths.add(routePath)
  }

  for (const routePath of await markdownRoutePaths('legal', '/legal/')) {
    paths.add(routePath)
  }

  paths.add('/docs/tutorial/')
  paths.add('/docs/bookmarks/bookmarklets/')

  for (const post of await loadBlogPosts()) {
    paths.add(post.routePath)
  }

  const urls = Array.from(paths).sort().map(routePath => {
    return `  <url>
    <loc>${escapeXml(new URL(routePath, baseUrl).href)}</loc>
  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

/**
 * @param {BlogPostSummary} post
 * @param {ViewContext} context
 * @returns {Promise<JsonFeedItem>}
 */
async function blogFeedItem (post, context) {
  const page = await loadMarkdownPage({
    filePath: markdownFilePath('blog', [post.year, post.slug]),
    routePath: post.routePath,
    context,
  })
  const url = new URL(post.routePath, context.baseUrl).href

  return {
    date_published: post.publishDate,
    title: post.title,
    url,
    id: `${url}#${post.publishDate}`,
    content_html: page?.html ?? '',
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {string} currentPath
 * @returns {ViewContext}
 */
function generatedViewContext (fastify, currentPath) {
  return {
    ...createDefaultViewContext(fastify),
    title: 'Feed',
    currentPath,
    htmx: {
      isHtmx: false,
      target: null,
      requestType: null,
    },
  }
}

/**
 * @param {string} section
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function markdownRoutePaths (section, prefix) {
  const root = contentSectionPath(section)
  const relPaths = await markdownReadmePaths(root)
  return relPaths.map(relPath => {
    const routeSuffix = relPath === 'README.md'
      ? ''
      : relPath.slice(0, -'/README.md'.length)
    return `${prefix}${routeSuffix ? `${routeSuffix}/` : ''}`
  })
}

/**
 * @param {string} root
 * @param {string} [directory]
 * @returns {Promise<string[]>}
 */
async function markdownReadmePaths (root, directory = root) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return []
    throw error
  }

  const paths = await Promise.all(entries.map(async entry => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return markdownReadmePaths(root, entryPath)
    if (entry.isFile() && entry.name === 'README.md') {
      return [path.relative(root, entryPath).replaceAll(path.sep, '/')]
    }
    return []
  }))

  return paths.flat()
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeXml (value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/**
 * @param {unknown} error
 * @returns {error is NodeJS.ErrnoException}
 */
function isNodeError (error) {
  return error instanceof Error && 'code' in error
}
