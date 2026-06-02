/**
 * @import { ContentFrontmatter } from '../content/markdown.js'
 */

import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { contentSectionPath, loadMarkdownFrontmatter, stringFrontmatter } from '../content/markdown.js'

/**
 * @typedef {object} BlogPostSummary
 * @property {string} title
 * @property {string} year
 * @property {string} slug
 * @property {string} routePath
 * @property {string} publishDate
 * @property {ContentFrontmatter} frontmatter
 */

/**
 * @returns {Promise<BlogPostSummary[]>}
 */
export async function loadBlogPosts () {
  const blogRoot = contentSectionPath('blog')
  const years = await safeDirectoryNames(blogRoot)
  /** @type {BlogPostSummary[]} */
  const posts = []

  for (const year of years) {
    const yearPath = path.join(blogRoot, year)
    const slugs = await safeDirectoryNames(yearPath)
    for (const slug of slugs) {
      const filePath = path.join(yearPath, slug, 'README.md')
      const frontmatter = await loadMarkdownFrontmatter(filePath)
      if (!frontmatter) continue

      const title = stringFrontmatter(frontmatter, 'title')
      const publishDate = stringFrontmatter(frontmatter, 'publishDate')
      if (!title || !publishDate) continue

      posts.push({
        title,
        year,
        slug,
        routePath: `/blog/${year}/${slug}/`,
        publishDate,
        frontmatter,
      })
    }
  }

  return posts.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
}

/**
 * @returns {Promise<string[]>}
 */
export async function loadBlogYears () {
  const years = new Set((await loadBlogPosts()).map(post => post.year))
  return Array.from(years).sort((a, b) => Number(b) - Number(a))
}

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function safeDirectoryNames (directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return []
    throw error
  }
}

/**
 * @param {unknown} error
 * @returns {error is NodeJS.ErrnoException}
 */
function isNodeError (error) {
  return error instanceof Error && 'code' in error
}
