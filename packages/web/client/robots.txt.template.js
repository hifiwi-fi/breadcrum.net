/**
 * @import { TemplateFunction } from '@domstack/static'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/** @type {TemplateFunction<GlobalVars>} */
export default async ({
  vars: {
    baseUrl,
  },
}) => `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
