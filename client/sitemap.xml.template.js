import builder from 'xmlbuilder'

/**
 * @import { DataDeps, AsyncTemplateFunction } from '@domstack/static/types.js'
 * @import { SitemapData } from './globals/global.data.js'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/**
 * @typedef {GlobalVars & {
 *   noindex?: boolean
 * }} SitemapTemplateVars
 */

/** @satisfies {DataDeps<SitemapData>} */
export const dataDeps = ['sitemapPaths']

/** @type {AsyncTemplateFunction<SitemapTemplateVars, SitemapData>} */
export default async ({
  vars: {
    baseUrl,
  },
  data: { sitemapPaths },
}) => {
  const sitemapObj = {
    urlset: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: sitemapPaths.map(path => ({
        loc: `${baseUrl}/${path}${path && !path.endsWith('.html') ? '/' : ''}`,
      })),
    },
  }
  const feed = builder.create(sitemapObj, { encoding: 'utf-8' })
  return feed.end({ pretty: true, allowEmpty: false })
}
