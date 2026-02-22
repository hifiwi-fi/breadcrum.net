import builder from 'xmlbuilder'

/**
 * @import { TemplateFunction } from '@domstack/static'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/**
 * @typedef {GlobalVars & {
 *   noindex?: boolean
 * }} SitemapTemplateVars
 */

/** @type {TemplateFunction<SitemapTemplateVars>} */
export default async ({
  vars: {
    baseUrl,
  },
  pages,
}) => {
  const sitemapObj = {
    urlset: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: pages.filter(page => !page.vars.noindex).map(page => ({
        loc: `${baseUrl}/${page.pageInfo.path}${page.pageInfo.path && !page.pageInfo.path.endsWith('.html') ? '/' : ''}`,
      })),
    },
  }
  const feed = builder.create(sitemapObj, { encoding: 'utf-8' })
  return feed.end({ pretty: true, allowEmpty: false })
}
