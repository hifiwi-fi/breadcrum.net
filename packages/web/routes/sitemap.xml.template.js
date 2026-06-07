import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { loadBlogPosts } from './blog/blog-posts.js'
import { contentSectionPath } from './content/markdown.js'
import { createTemplateContext } from './template-context.js'

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

export default async function sitemapXmlTemplate () {
  const context = await createTemplateContext()
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
    <loc>${escapeXml(new URL(routePath, context.baseUrl).href)}</loc>
  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
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
