/**
 * @import { AsyncTemplateFunction } from '@domstack/static/types.js'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/** @type {AsyncTemplateFunction<GlobalVars>} */
export default async ({
  vars: {
    baseUrl,
  },
}) => `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
