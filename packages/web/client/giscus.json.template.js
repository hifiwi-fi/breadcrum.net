/**
 * @import { TemplateFunction } from '@domstack/static'
 */

/** @type {TemplateFunction<{
 *  siteName: string,
 *  description: string,
 *  siteUrl: string,
 *  authorName: string,
 *  authorUrl: string,
 *  authorImgUrl: string
 *  layout: string,
 *  publishDate: string
 *  title: string
 * }>} */
export default async ({
  vars: {
    baseUrl,
  },
}) => {
  return JSON.stringify({
    origins: [baseUrl],
    originsRegex: ['http://localhost:[0-9]+'],
  }, null, ' ')
}
