/**
 * @import { TemplateFunction } from '@domstack/static'
 */

/** @type {TemplateFunction<{
 *  baseUrl: string,
 * }>} */
export default async ({
  vars: {
    baseUrl,
  },
}) => `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
