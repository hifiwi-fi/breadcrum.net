/**
 * @import { ViewContext } from '#views/context.js'
 * @import { BlogPostSummary } from './blog/blog-posts.js'
 */

import jsonfeedToAtom from 'jsonfeed-to-atom'
import { loadBlogPosts } from './blog/blog-posts.js'
import { loadMarkdownPage, markdownFilePath } from './content/markdown.js'
import { createTemplateContext } from './template-context.js'

/**
 * @typedef {object} JsonFeedAuthor
 * @property {string} name
 * @property {string} url
 * @property {string} avatar
 */

/**
 * @typedef {object} JsonFeedItem
 * @property {string} id
 * @property {string} url
 * @property {string} title
 * @property {string} date_published
 * @property {string} content_html
 */

/**
 * @typedef {object} JsonFeed
 * @property {string} version
 * @property {string} title
 * @property {string} home_page_url
 * @property {string} feed_url
 * @property {string} description
 * @property {JsonFeedAuthor} author
 * @property {JsonFeedItem[]} items
 */

/**
 * @typedef {Omit<ViewContext, 'currentPath' | 'htmx' | 'title'>} TemplateViewContext
 */

export default async function * feedsTemplate () {
  const context = await createTemplateContext()
  const feed = await blogJsonFeed(context)

  yield {
    content: JSON.stringify(feed, null, '  '),
    outputName: 'feed.json',
  }

  yield {
    content: jsonfeedToAtom(feed),
    outputName: 'feed.xml',
  }
}

/**
 * @param {TemplateViewContext} baseContext
 * @returns {Promise<JsonFeed>}
 */
async function blogJsonFeed (baseContext) {
  const context = feedViewContext(baseContext, '/feed.json')
  const posts = (await loadBlogPosts()).slice(0, 10)

  return {
    version: 'https://jsonfeed.org/version/1',
    title: context.siteName,
    home_page_url: context.baseUrl,
    feed_url: `${context.baseUrl}/feed.json`,
    description: context.siteDescription,
    author: {
      name: 'Breadcrum',
      url: context.baseUrl,
      avatar: `${context.baseUrl}/static/breadcrum-fill-red.png`,
    },
    items: await Promise.all(posts.map(post => blogFeedItem(post, context))),
  }
}

/**
 * @param {BlogPostSummary} post
 * @param {ViewContext} context
 * @returns {Promise<JsonFeedItem>}
 */
async function blogFeedItem (post, context) {
  const page = await loadMarkdownPage({
    filePath: markdownFilePath('blog', [post.year, post.slug]),
    routePath: post.routePath,
    context,
  })
  const url = new URL(post.routePath, context.baseUrl).href

  return {
    date_published: post.publishDate,
    title: post.title,
    url,
    id: `${url}#${post.publishDate}`,
    content_html: page?.html ?? '',
  }
}

/**
 * @param {TemplateViewContext} baseContext
 * @param {string} currentPath
 * @returns {ViewContext}
 */
function feedViewContext (baseContext, currentPath) {
  return {
    ...baseContext,
    title: 'Feed',
    currentPath,
    htmx: {
      isHtmx: false,
      target: null,
      requestType: null,
    },
  }
}
