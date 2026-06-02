/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { RenderedMarkdownPage } from '../content/markdown.js'
 * @import { BlogPostSummary } from './blog-posts.js'
 */

import html from 'fragtml'
import { articleHeader, breadcrumb, dateText, markdownContent } from '../content/view-components.js'

/**
 * @typedef {object} BlogBasePageState
 * @property {string[]} pathSegments
 */

/**
 * @typedef {BlogBasePageState & { posts: BlogPostSummary[], years: string[] }} BlogIndexPageState
 */

/**
 * @typedef {BlogIndexPageState & { year: string }} BlogYearPageState
 */

/**
 * @typedef {ViewContext & { blogPage: BlogIndexPageState }} BlogIndexContext
 */

/**
 * @typedef {ViewContext & { blogPage: BlogYearPageState }} BlogYearContext
 */

/**
 * @typedef {ViewContext & { contentPage: RenderedMarkdownPage, blogPage: BlogBasePageState }} BlogArticleContext
 */

/**
 * @typedef {ViewContext & { blogPage: BlogBasePageState }} BlogNotFoundContext
 */

/**
 * @type {FragtmlTemplate<BlogIndexContext, AppLayoutName, AppFragmentId>}
 */
export const blogIndexPage = (context) => html/* html */`
  <div class="bc-content-page bc-blog-index-page">
    ${breadcrumb(context.blogPage.pathSegments)}
    <h1>Breadcrum.net Blog</h1>
    ${blogPostList(context.blogPage.posts)}
    <footer class="bc-blog-index-footer">
      <h2>Archive</h2>
      ${blogYearList(context.blogPage.years)}
    </footer>
  </div>
`

/**
 * @type {FragtmlTemplate<BlogYearContext, AppLayoutName, AppFragmentId>}
 */
export const blogYearPage = (context) => html/* html */`
  <div class="bc-content-page bc-blog-index-page">
    ${breadcrumb(context.blogPage.pathSegments)}
    <h1>All ${context.blogPage.year} Blog Posts</h1>
    ${blogPostList(context.blogPage.posts)}
  </div>
`

/**
 * @type {FragtmlTemplate<BlogArticleContext, AppLayoutName, AppFragmentId>}
 */
export const blogArticlePage = (context) => html/* html */`
  <div class="bc-content-page bc-blog-article-page">
    ${breadcrumb(context.blogPage.pathSegments)}
    <article class="bc-article h-entry" itemscope itemtype="http://schema.org/NewsArticle">
      ${articleHeader({
        title: context.contentPage.title,
        authorImgUrl: context.contentPage.authorImgUrl,
        authorImgAlt: context.contentPage.authorImgAlt,
        authorName: context.contentPage.authorName,
        authorUrl: context.contentPage.authorUrl,
        publishDate: context.contentPage.publishDate,
        updatedDate: context.contentPage.updatedDate,
      })}
      ${markdownContent(context.contentPage)}
      <footer class="bc-blog-footer">
        <p>Want to follow along for future updates? Follow our <a href="/docs/social/">socials and feeds</a>.</p>
      </footer>
    </article>
    <giscus-widget
      id="comments"
      repo="hifiwi-fi/breadcrum.net"
      repoid="MDEwOlJlcG9zaXRvcnkzMjIwMjk3OTk="
      category="Announcements"
      categoryid="DIC_kwDOEzHI584CN95V"
      mapping="og:title"
      strict="0"
      reactionsenabled="1"
      emitmetadata="0"
      inputposition="top"
      theme="preferred_color_scheme"
      lang="en"
      loading="lazy"
    ></giscus-widget>
    ${breadcrumb(context.blogPage.pathSegments)}
  </div>
`

/**
 * @type {FragtmlTemplate<BlogNotFoundContext, AppLayoutName, AppFragmentId>}
 */
export const blogNotFoundPage = (context) => html/* html */`
  <div class="bc-content-page bc-blog-index-page">
    ${breadcrumb(context.blogPage.pathSegments)}
    <h1>Blog post not found</h1>
    <p>The requested blog post could not be found.</p>
  </div>
`

/**
 * @param {BlogPostSummary[]} posts
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function blogPostList (posts) {
  return html/* html */`
    <ul class="bc-blog-index-list">
      ${posts.map(post => html/* html */`
        <li class="bc-blog-entry h-entry">
          <a class="bc-blog-entry-link u-url u-uid p-name" href="${post.routePath}">${post.title}</a>
          <time class="bc-blog-entry-date dt-published" datetime="${new Date(post.publishDate).toISOString()}">
            ${dateText(post.publishDate)}
          </time>
        </li>
      `)}
    </ul>
  `
}

/**
 * @param {string[]} years
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function blogYearList (years) {
  return html/* html */`
    <ul class="bc-blog-archive-list">
      ${years.map(year => html/* html */`
        <li><a href="/blog/${year}/">${year}</a></li>
      `)}
    </ul>
  `
}
