/**
 * @import { TemplateFunction } from '@domstack/static/types.ts'
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
