import builder from 'xmlbuilder'

/**
 * @template T
 * @typedef {import('top-bun').TemplateFunction<T>} TemplateFunction
 */

/** @type {TemplateFunction<{
 *  baseUrl: string,
 *  noindex?: boolean
 * }>} */
export default async ({
  vars: {
    baseUrl
  },
  pages
}) => {
  const sitemapObj = {
    urlset: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: pages.filter(page => !page.vars.noindex).map(page => ({
        loc: `${baseUrl}/${page.pageInfo.path}${page.pageInfo.path && !page.pageInfo.path.endsWith('.html') ? '/' : ''}`
      }))
    }
  }
  const feed = builder.create(sitemapObj, { encoding: 'utf-8' })
  return feed.end({ pretty: true, allowEmpty: false })
}
