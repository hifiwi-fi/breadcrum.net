/**
 * @template T
 * @typedef {import('top-bun').PageFunction<T>} PageFunction
 */

export const vars = {
  title: 'All 2023 Blog Posts',
  layout: 'blog-auto-index',
  noindex: true,
}

/**
 * @type {PageFunction<{
 *       title: string
 *       publishDate: string
 * }>}
 */
export default async function blogIndex2023 () {
  return ''
}
