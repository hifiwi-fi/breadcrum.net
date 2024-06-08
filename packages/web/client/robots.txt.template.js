/**
 * @template T
 * @typedef {import('top-bun').TemplateFunction<T>} TemplateFunction
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
