/**
 * @import { DataDeps, TemplateAsyncIterator } from '@domstack/static/types.js'
 * @import { FeedData } from './globals/global.data.js'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/** @type {(feed: any) => string} */
// @ts-ignore - jsonfeed-to-atom has no type definitions
import jsonfeedToAtom from 'jsonfeed-to-atom'

/**
 * @typedef {GlobalVars & {
 *   layout?: string,
 *   title?: string,
 *   publishDate?: string
 * }} FeedTemplateVars
 */

/** @satisfies {DataDeps<FeedData>} */
export const dataDeps = ['feedPosts']

/** @type {TemplateAsyncIterator<FeedTemplateVars, FeedData>} */
export default async function * feedsTemplate (args) {
  const {
    vars: {
      siteName,
      siteDescription,
      host,
      transport,
      authorName,
      authorUrl,
      authorImgUrl,
    },
    data: { feedPosts },
  } = args

  const baseUrl = `${transport}://${host}`

  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1',
    title: siteName,
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/feed.json`,
    description: siteDescription,
    author: {
      name: authorName,
      url: authorUrl,
      avatar: authorImgUrl,
    },
    items: feedPosts.map(page => ({
      date_published: page.publishDate,
      title: page.title,
      url: `${baseUrl}/${page.path}/`,
      id: `${baseUrl}/${page.path}/#${page.publishDate}`,
      content_html: page.content,
    })),
  }

  yield {
    content: JSON.stringify(jsonFeed, null, '  '),
    outputName: 'feed.json',
  }

  yield {
    content: jsonfeedToAtom(jsonFeed),
    outputName: 'feed.xml',
  }
}
