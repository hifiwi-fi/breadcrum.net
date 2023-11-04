/**
 * @template T
 * @typedef {import('@siteup/cli').PageFunction<T>} PageFunction
 */

export const vars = {
  title: 'Breadcrum.net 2023 Blogs',
  layout: 'blog-auto-index'
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
